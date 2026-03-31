package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
)

// ScrapeDispatchPayload is the payload for the scrape:dispatch task.
type ScrapeDispatchPayload struct {
	UserID          string   `json:"user_id"`
	ScrapeRunID     string   `json:"scrape_run_id"`
	SearchProfileID string   `json:"search_profile_id"`
	Keywords        []string `json:"keywords"`
	Location        string   `json:"location"`
	Country         string   `json:"country"`
	Sources         []string `json:"sources"`
}

// ScrapeDispatchDeps holds dependencies for the scrape:dispatch task.
type ScrapeDispatchDeps struct {
	Pool        *pgxpool.Pool
	Redis       *redis.Client
	AsynqClient *asynq.Client
	ScraperURLs map[string]string // source name -> scraper service URL
}

// HandleScrapeDispatch returns an Asynq handler that fans out scrape:source sub-tasks.
func HandleScrapeDispatch(deps *ScrapeDispatchDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload ScrapeDispatchPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			slog.Error("scrape:dispatch unmarshal failed", "error", err, "raw_payload", string(t.Payload()))
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("dispatching scrape run",
			"user_id", payload.UserID,
			"scrape_run_id", payload.ScrapeRunID,
			"sources", payload.Sources,
		)

		q := db.New(deps.Pool)

		var runUUID pgtype.UUID
		if err := runUUID.Scan(payload.ScrapeRunID); err != nil {
			slog.Error("scrape:dispatch UUID parse failed", "scrape_run_id", payload.ScrapeRunID, "error", err)
			return fmt.Errorf("parse scrape_run_id: %w", err)
		}

		// Update status to running
		slog.Debug("scrape:dispatch updating status to running", "scrape_run_id", payload.ScrapeRunID)
		if err := q.UpdateScrapeRunStatus(ctx, db.UpdateScrapeRunStatusParams{
			ID:           runUUID,
			Status:       pgtype.Text{String: "running", Valid: true},
			ErrorMessage: pgtype.Text{},
		}); err != nil {
			slog.Error("scrape:dispatch DB update failed", "scrape_run_id", payload.ScrapeRunID, "error", err)
			return fmt.Errorf("update scrape run status: %w", err)
		}
		slog.Debug("scrape:dispatch status updated to running", "scrape_run_id", payload.ScrapeRunID)

		// SSE: scrape started
		publishSSE(deps.Redis, payload.UserID, "scrape_started", map[string]interface{}{
			"scrape_run_id": payload.ScrapeRunID,
			"sources":       payload.Sources,
		})

		// Initialize Redis counter for coordination
		pendingKey := fmt.Sprintf("scrape_run:%s:pending", payload.ScrapeRunID)
		if err := deps.Redis.Set(ctx, pendingKey, len(payload.Sources), 1*time.Hour).Err(); err != nil {
			slog.Error("scrape:dispatch Redis SET failed", "key", pendingKey, "error", err)
		}

		// Fan out one sub-task per source
		slog.Debug("scrape:dispatch fanning out sources", "scrape_run_id", payload.ScrapeRunID, "scraper_urls", deps.ScraperURLs)
		var dispatched int
		for _, source := range payload.Sources {
			scraperURL, ok := deps.ScraperURLs[source]
			if !ok {
				slog.Warn("no scraper URL configured for source", "source", source, "available_sources", deps.ScraperURLs)
				// Decrement pending count for unconfigured sources
				deps.Redis.Decr(ctx, pendingKey)
				continue
			}

			subPayload, _ := json.Marshal(ScrapeSourcePayload{
				UserID:      payload.UserID,
				ScrapeRunID: payload.ScrapeRunID,
				Source:      source,
				ScraperURL:  scraperURL,
				Keywords:    payload.Keywords,
				Location:    payload.Location,
				Country:     payload.Country,
				MaxResults:  50,
			})

			task := asynq.NewTask(TypeScrapeSource, subPayload)
			if _, err := deps.AsynqClient.Enqueue(task); err != nil {
				slog.Error("failed to enqueue scrape:source", "source", source, "scraper_url", scraperURL, "error", err)
				deps.Redis.Decr(ctx, pendingKey)
				continue
			}
			slog.Debug("scrape:source enqueued", "source", source, "scraper_url", scraperURL)
			dispatched++
		}

		slog.Info("scrape:dispatch fan-out complete", "scrape_run_id", payload.ScrapeRunID, "dispatched", dispatched, "total_sources", len(payload.Sources))

		if dispatched == 0 {
			// No sources could be dispatched
			if err := q.UpdateScrapeRunStatus(ctx, db.UpdateScrapeRunStatusParams{
				ID:           runUUID,
				Status:       pgtype.Text{String: "failed", Valid: true},
				ErrorMessage: pgtype.Text{String: "no scraper sources available", Valid: true},
			}); err != nil {
				slog.Error("failed to update scrape run status", "error", err)
			}
			publishSSE(deps.Redis, payload.UserID, "scrape_completed", map[string]interface{}{
				"scrape_run_id": payload.ScrapeRunID,
				"status":        "failed",
				"error":         "no scraper sources available",
			})
		}

		return nil
	}
}

// publishSSE publishes an SSE event via Redis Pub/Sub.
func publishSSE(rdb *redis.Client, userID, eventType string, data interface{}) {
	if rdb == nil {
		return
	}
	payload, _ := json.Marshal(map[string]interface{}{
		"type": eventType,
		"data": data,
	})
	rdb.Publish(context.Background(), fmt.Sprintf("sse:%s", userID), string(payload))
}
