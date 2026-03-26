package tasks

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
)

// ScrapeSourcePayload is the payload for the scrape:source task.
type ScrapeSourcePayload struct {
	UserID      string   `json:"user_id"`
	ScrapeRunID string   `json:"scrape_run_id"`
	Source      string   `json:"source"`
	ScraperURL  string   `json:"scraper_url"`
	Keywords    []string `json:"keywords"`
	Location    string   `json:"location"`
	Country     string   `json:"country"`
	MaxResults  int      `json:"max_results"`
}

// ScrapeRequest is sent to the scraper HTTP service.
type ScrapeRequest struct {
	Keywords   []string `json:"keywords"`
	Location   string   `json:"location"`
	Country    string   `json:"country"`
	MaxResults int      `json:"maxResults"`
}

// RawJob represents a job returned by a scraper service.
type RawJob struct {
	Title           string   `json:"title"`
	Company         string   `json:"company"`
	Location        string   `json:"location"`
	LocationType    string   `json:"locationType"`
	SalaryMin       *int32   `json:"salaryMin"`
	SalaryMax       *int32   `json:"salaryMax"`
	SalaryCurrency  string   `json:"salaryCurrency"`
	SalaryInterval  string   `json:"salaryInterval"`
	Description     string   `json:"description"`
	SourceURL       string   `json:"sourceUrl"`
	ApplicationURL  string   `json:"applicationUrl"`
	JobType         string   `json:"jobType"`
	ExperienceLevel string   `json:"experienceLevel"`
	PostedAt        string   `json:"postedAt"`
	Skills          []string `json:"skills"`
}

// ScrapeResponse is the response from a scraper service.
type ScrapeResponse struct {
	Jobs           []RawJob `json:"jobs"`
	TotalEstimated *int     `json:"totalEstimated"`
	Error          string   `json:"error"`
}

// ScrapeSourceDeps holds dependencies for the scrape:source task.
type ScrapeSourceDeps struct {
	Pool       *pgxpool.Pool
	Redis      *redis.Client
	HTTPClient *http.Client
}

// HandleScrapeSource returns an Asynq handler that calls a single scraper service.
func HandleScrapeSource(deps *ScrapeSourceDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload ScrapeSourcePayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("scraping source",
			"user_id", payload.UserID,
			"scrape_run_id", payload.ScrapeRunID,
			"source", payload.Source,
		)

		q := db.New(deps.Pool)

		var runUUID pgtype.UUID
		if err := runUUID.Scan(payload.ScrapeRunID); err != nil {
			return fmt.Errorf("parse scrape_run_id: %w", err)
		}

		// Call the scraper HTTP service
		rawJobs, err := callScraper(ctx, deps.HTTPClient, payload)
		if err != nil {
			slog.Error("scraper call failed", "source", payload.Source, "error", err)
			finalizeScrapeSource(ctx, deps, q, runUUID, payload, 0, 0, err.Error())
			return nil // Don't retry on scraper failure
		}

		// Dedup and insert jobs
		var jobsFound, jobsNew int
		jobsFound = len(rawJobs)

		for _, raw := range rawJobs {
			if raw.Title == "" || raw.SourceURL == "" {
				continue
			}

			hash := dedupHash(raw.Title, raw.Company, raw.Location)

			var salaryMin, salaryMax pgtype.Int4
			if raw.SalaryMin != nil {
				salaryMin = pgtype.Int4{Int32: *raw.SalaryMin, Valid: true}
			}
			if raw.SalaryMax != nil {
				salaryMax = pgtype.Int4{Int32: *raw.SalaryMax, Valid: true}
			}

			var skillsJSON []byte
			if len(raw.Skills) > 0 {
				skillsJSON, _ = json.Marshal(raw.Skills)
			}

			job, err := q.CreateScrapedJob(ctx, db.CreateScrapedJobParams{
				UserID:         payload.UserID,
				Title:          raw.Title,
				Source:         pgtype.Text{String: payload.Source, Valid: true},
				SourceUrl:      pgtype.Text{String: raw.SourceURL, Valid: true},
				Location:       pgtype.Text{String: raw.Location, Valid: raw.Location != ""},
				LocationType:   pgtype.Text{String: raw.LocationType, Valid: raw.LocationType != ""},
				SalaryMin:      salaryMin,
				SalaryMax:      salaryMax,
				SalaryCurrency: pgtype.Text{String: raw.SalaryCurrency, Valid: raw.SalaryCurrency != ""},
				SalaryInterval: pgtype.Text{String: raw.SalaryInterval, Valid: raw.SalaryInterval != ""},
				JdRaw:          pgtype.Text{String: raw.Description, Valid: raw.Description != ""},
				JobType:        pgtype.Text{String: raw.JobType, Valid: raw.JobType != ""},
				JobLevel:       pgtype.Text{String: raw.ExperienceLevel, Valid: raw.ExperienceLevel != ""},
				ApplicationUrl: pgtype.Text{String: raw.ApplicationURL, Valid: raw.ApplicationURL != ""},
				Skills:         skillsJSON,
				DedupHash:      pgtype.Text{String: hash, Valid: true},
				ScrapeRunID:    runUUID,
			})
			if err != nil {
				slog.Warn("failed to insert scraped job", "title", raw.Title, "error", err)
				continue
			}
			// CreateScrapedJob uses ON CONFLICT DO NOTHING — if ID is zero, it was a duplicate
			if job.ID.Valid {
				jobsNew++
			}
		}

		finalizeScrapeSource(ctx, deps, q, runUUID, payload, jobsFound, jobsNew, "")
		return nil
	}
}

// callScraper sends a POST /scrape request to the scraper service and returns raw jobs.
func callScraper(ctx context.Context, client *http.Client, payload ScrapeSourcePayload) ([]RawJob, error) {
	reqBody, _ := json.Marshal(ScrapeRequest{
		Keywords:   payload.Keywords,
		Location:   payload.Location,
		Country:    payload.Country,
		MaxResults: payload.MaxResults,
	})

	url := strings.TrimRight(payload.ScraperURL, "/") + "/scrape"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB limit
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scraper returned %d: %s", resp.StatusCode, string(body))
	}

	var scrapeResp ScrapeResponse
	if err := json.Unmarshal(body, &scrapeResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if scrapeResp.Error != "" {
		return nil, fmt.Errorf("scraper error: %s", scrapeResp.Error)
	}

	return scrapeResp.Jobs, nil
}

// dedupHash computes a SHA-256 hash of lower(title + company + location) for deduplication.
func dedupHash(title, company, location string) string {
	input := strings.ToLower(title + company + location)
	h := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%x", h)
}

// finalizeScrapeSource updates counts, decrements the pending counter, and finalizes if last.
func finalizeScrapeSource(
	ctx context.Context,
	deps *ScrapeSourceDeps,
	q *db.Queries,
	runUUID pgtype.UUID,
	payload ScrapeSourcePayload,
	jobsFound, jobsNew int,
	errMsg string,
) {
	// Increment counts on the scrape run
	if err := q.IncrementScrapeRunCounts(ctx, db.IncrementScrapeRunCountsParams{
		ID:      runUUID,
		JobsFound: pgtype.Int4{Int32: int32(jobsFound), Valid: true},
		JobsNew:   pgtype.Int4{Int32: int32(jobsNew), Valid: true},
	}); err != nil {
		slog.Error("failed to increment scrape run counts", "error", err)
	}

	// SSE: source progress
	publishSSE(deps.Redis, payload.UserID, "scrape_progress", map[string]interface{}{
		"scrape_run_id": payload.ScrapeRunID,
		"source":        payload.Source,
		"jobs_found":    jobsFound,
		"jobs_new":      jobsNew,
		"error":         errMsg,
	})

	// Decrement pending counter — if we're the last source, finalize
	pendingKey := fmt.Sprintf("scrape_run:%s:pending", payload.ScrapeRunID)
	remaining, err := deps.Redis.Decr(ctx, pendingKey).Result()
	if err != nil {
		slog.Error("failed to decrement pending counter", "error", err)
		return
	}

	if remaining <= 0 {
		// We're the last source — finalize the run
		deps.Redis.Del(ctx, pendingKey)

		status := "completed"

		if err := q.UpdateScrapeRunStatus(ctx, db.UpdateScrapeRunStatusParams{
			ID:           runUUID,
			Status:       pgtype.Text{String: status, Valid: true},
			ErrorMessage: pgtype.Text{},
		}); err != nil {
			slog.Error("failed to finalize scrape run", "error", err)
		}

		// SSE: scrape completed
		publishSSE(deps.Redis, payload.UserID, "scrape_completed", map[string]interface{}{
			"scrape_run_id": payload.ScrapeRunID,
			"status":        status,
		})

		slog.Info("scrape run completed",
			"scrape_run_id", payload.ScrapeRunID,
			"status", status,
		)
	}
}
