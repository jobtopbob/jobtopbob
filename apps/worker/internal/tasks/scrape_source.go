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
	"regexp"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
)

// ScrapeSourcePayload is the payload for the scrape:source task.
type ScrapeSourcePayload struct {
	UserID        string   `json:"user_id"`
	ScrapeRunID   string   `json:"scrape_run_id"`
	Source        string   `json:"source"`
	ScraperURL    string   `json:"scraper_url"`
	Keywords      []string `json:"keywords"`
	Location      string   `json:"location"`
	Country       string   `json:"country"`
	Language      string   `json:"language"`
	NextPageToken string   `json:"next_page_token"`
	MaxResults    int      `json:"max_results"`
}

// ScrapeRequest is sent to the scraper HTTP service.
type ScrapeRequest struct {
	Keywords      []string `json:"keywords"`
	Location      string   `json:"location"`
	Country       string   `json:"country"`
	Language      string   `json:"language,omitempty"`
	MaxResults    int      `json:"maxResults"`
	NextPageToken string   `json:"nextPageToken,omitempty"`
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
	Via             string   `json:"via"`
	JobHighlights   json.RawMessage `json:"jobHighlights"`
	Benefits        json.RawMessage `json:"benefits"`
	ExternalID      string   `json:"externalId"`
	ApplyOptions    json.RawMessage `json:"applyOptions"`
	ThumbnailURL    string   `json:"thumbnailUrl"`
}

// ScrapeResponse is the response from a scraper service.
type ScrapeResponse struct {
	Jobs           []RawJob `json:"jobs"`
	TotalEstimated *int     `json:"totalEstimated"`
	NextPageToken  string   `json:"nextPageToken"`
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
			"scraper_url", payload.ScraperURL,
		)

		q := db.New(deps.Pool)

		var runUUID pgtype.UUID
		if err := runUUID.Scan(payload.ScrapeRunID); err != nil {
			slog.Error("scrape:source UUID parse failed", "scrape_run_id", payload.ScrapeRunID, "error", err)
			return fmt.Errorf("parse scrape_run_id: %w", err)
		}

		// Call the scraper HTTP service
		slog.Debug("scrape:source calling scraper", "url", payload.ScraperURL+"/scrape", "keywords", payload.Keywords, "location", payload.Location, "country", payload.Country)
		scrapeResp, err := callScraper(ctx, deps.HTTPClient, payload)
		if err != nil {
			slog.Error("scraper call failed", "source", payload.Source, "scraper_url", payload.ScraperURL, "error", err)
			finalizeScrapeSource(ctx, deps, q, runUUID, payload, 0, 0, "", err.Error())
			return nil // Don't retry on scraper failure
		}
		rawJobs := scrapeResp.Jobs
		slog.Info("scraper call succeeded", "source", payload.Source, "jobs_returned", len(rawJobs))

		// Dedup and insert jobs
		var jobsFound, jobsNew int
		jobsFound = len(rawJobs)

		// Cache resolved company IDs to avoid repeated DB lookups within a batch
		companyCache := make(map[string]pgtype.UUID)

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

			// Resolve company: find existing or create a new one
			var companyID pgtype.UUID
			if raw.Company != "" {
				companyID = resolveCompanyID(ctx, q, payload.UserID, raw.Company, raw.ThumbnailURL, companyCache)
			}

			// Parse relative posted_at string (e.g., "3 days ago") to timestamp
			var postedAt pgtype.Timestamptz
			if raw.PostedAt != "" {
				if t, ok := parseRelativeDate(raw.PostedAt); ok {
					postedAt = pgtype.Timestamptz{Time: t, Valid: true}
				}
			}

			job, err := q.CreateScrapedJob(ctx, db.CreateScrapedJobParams{
				UserID:         payload.UserID,
				CompanyID:      companyID,
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
				PostedAt:       postedAt,
				Via:            pgtype.Text{String: raw.Via, Valid: raw.Via != ""},
				JobHighlights:  raw.JobHighlights,
				Benefits:       raw.Benefits,
				ExternalID:     pgtype.Text{String: raw.ExternalID, Valid: raw.ExternalID != ""},
				ApplyOptions:   raw.ApplyOptions,
				ThumbnailUrl:   pgtype.Text{String: raw.ThumbnailURL, Valid: raw.ThumbnailURL != ""},
			})
			if err != nil {
				slog.Warn("failed to insert scraped job", "title", raw.Title, "error", err)
				continue
			}
			// Upsert always returns a row — if created_at == updated_at, it's new
			if job.CreatedAt.Time.Equal(job.UpdatedAt.Time) {
				jobsNew++
			}
		}

		finalizeScrapeSource(ctx, deps, q, runUUID, payload, jobsFound, jobsNew, scrapeResp.NextPageToken, "")
		return nil
	}
}

// callScraper sends a POST /scrape request to the scraper service and returns the full response.
func callScraper(ctx context.Context, client *http.Client, payload ScrapeSourcePayload) (*ScrapeResponse, error) {
	reqBody, _ := json.Marshal(ScrapeRequest{
		Keywords:      payload.Keywords,
		Location:      payload.Location,
		Country:       payload.Country,
		Language:      payload.Language,
		MaxResults:    payload.MaxResults,
		NextPageToken: payload.NextPageToken,
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

	return &scrapeResp, nil
}

// resolveCompanyID finds an existing company by name (case-insensitive) or creates one.
// Results are cached in companyCache to avoid repeated DB lookups within a batch.
func resolveCompanyID(ctx context.Context, q *db.Queries, userID, companyName, thumbnailURL string, cache map[string]pgtype.UUID) pgtype.UUID {
	key := strings.ToLower(companyName)
	if id, ok := cache[key]; ok {
		return id
	}

	// Try to find existing company by name (case-insensitive exact match)
	companies, err := q.FindCompanyByNameFuzzy(ctx, db.FindCompanyByNameFuzzyParams{
		UserID: userID,
		Lower:  companyName,
	})
	if err == nil && len(companies) > 0 {
		cache[key] = companies[0].ID
		return companies[0].ID
	}

	// Create a minimal company record with logo if available
	company, err := q.CreateCompany(ctx, db.CreateCompanyParams{
		UserID:           userID,
		Name:             companyName,
		LogoUrl:          pgtype.Text{String: thumbnailURL, Valid: thumbnailURL != ""},
		DataSource:       "scraped",
		EnrichmentStatus: "none",
	})
	if err != nil {
		slog.Warn("failed to create company for scraped job", "company", companyName, "error", err)
		return pgtype.UUID{} // Return invalid UUID — job will have NULL company_id
	}

	cache[key] = company.ID
	return company.ID
}

// parseRelativeDate converts relative date strings like "3 days ago" to a time.Time.
var relDateRe = regexp.MustCompile(`(\d+)\s+(hour|day|week|month)s?\s+ago`)

func parseRelativeDate(s string) (time.Time, bool) {
	now := time.Now()
	m := relDateRe.FindStringSubmatch(strings.ToLower(s))
	if m == nil {
		return time.Time{}, false
	}
	n := 0
	fmt.Sscanf(m[1], "%d", &n)
	switch m[2] {
	case "hour":
		return now.Add(-time.Duration(n) * time.Hour), true
	case "day":
		return now.AddDate(0, 0, -n), true
	case "week":
		return now.AddDate(0, 0, -7*n), true
	case "month":
		return now.AddDate(0, -n, 0), true
	}
	return time.Time{}, false
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
	nextPageToken string,
	errMsg string,
) {
	// Increment counts on the scrape run
	if err := q.IncrementScrapeRunCounts(ctx, db.IncrementScrapeRunCountsParams{
		ID:        runUUID,
		JobsFound: pgtype.Int4{Int32: int32(jobsFound), Valid: true},
		JobsNew:   pgtype.Int4{Int32: int32(jobsNew), Valid: true},
	}); err != nil {
		slog.Error("failed to increment scrape run counts", "error", err)
	}

	// Store the next page token for "Load More" functionality
	if nextPageToken != "" {
		if err := q.UpdateScrapeRunNextPageToken(ctx, db.UpdateScrapeRunNextPageTokenParams{
			ID:            runUUID,
			NextPageToken: pgtype.Text{String: nextPageToken, Valid: true},
		}); err != nil {
			slog.Error("failed to store next page token", "error", err)
		}
	}

	// SSE: source progress
	progressData := map[string]interface{}{
		"scrape_run_id": payload.ScrapeRunID,
		"source":        payload.Source,
		"jobs_found":    jobsFound,
		"jobs_new":      jobsNew,
	}
	if errMsg != "" {
		progressData["error"] = errMsg
	}
	publishSSE(deps.Redis, payload.UserID, "scrape_progress", progressData)

	// Decrement pending counter — if we're the last source, finalize
	pendingKey := fmt.Sprintf("scrape_run:%s:pending", payload.ScrapeRunID)
	remaining, err := deps.Redis.Decr(ctx, pendingKey).Result()
	if err != nil {
		slog.Error("failed to decrement pending counter", "key", pendingKey, "error", err)
		return
	}
	slog.Debug("scrape:source pending counter decremented", "scrape_run_id", payload.ScrapeRunID, "remaining", remaining)

	if remaining <= 0 {
		// We're the last source — finalize the run
		deps.Redis.Del(ctx, pendingKey)

		status := "completed"
		var finalError pgtype.Text
		if errMsg != "" {
			status = "failed"
			finalError = pgtype.Text{String: errMsg, Valid: true}
		}

		if err := q.UpdateScrapeRunStatus(ctx, db.UpdateScrapeRunStatusParams{
			ID:           runUUID,
			Status:       pgtype.Text{String: status, Valid: true},
			ErrorMessage: finalError,
		}); err != nil {
			slog.Error("failed to finalize scrape run", "error", err)
		}

		// SSE: scrape completed
		sseData := map[string]interface{}{
			"scrape_run_id": payload.ScrapeRunID,
			"status":        status,
			"has_more":      nextPageToken != "",
		}
		if errMsg != "" {
			sseData["error"] = errMsg
		}
		publishSSE(deps.Redis, payload.UserID, "scrape_completed", sseData)

		slog.Info("scrape run completed",
			"scrape_run_id", payload.ScrapeRunID,
			"status", status,
			"has_more", nextPageToken != "",
		)
	}
}
