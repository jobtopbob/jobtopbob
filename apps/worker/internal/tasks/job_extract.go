package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"text/template"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/ai"
	"github.com/jobtopbob/jobtopbob/internal/ai/prompts"
)

// JobExtractPayload is the payload for the job:extract task.
type JobExtractPayload struct {
	UserID string `json:"user_id"`
	JobID  string `json:"job_id"`
}

// JobExtractResult is the structured output from AI JD extraction.
type JobExtractResult struct {
	SalaryRange     string   `json:"salary_range"`
	Location        string   `json:"location"`
	LocationType    string   `json:"location_type"`
	Requirements    []string `json:"requirements"`
	Skills          []string `json:"skills"`
	JobType         string   `json:"job_type"`
	JobLevel        string   `json:"job_level"`
	ExperienceRange string   `json:"experience_range"`
	Summary         string   `json:"description_summary"`
}

// JobExtractDeps holds dependencies for the job:extract task.
type JobExtractDeps struct {
	Pool       *pgxpool.Pool
	Redis      *redis.Client
	AIProvider ai.Provider
}

// HandleJobExtract returns an Asynq handler for the job:extract task.
func HandleJobExtract(deps *JobExtractDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload JobExtractPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("extracting JD fields", "user_id", payload.UserID, "job_id", payload.JobID)

		q := db.New(deps.Pool)

		// Fetch job
		var jobUUID pgtype.UUID
		if err := jobUUID.Scan(payload.JobID); err != nil {
			return fmt.Errorf("parse job_id: %w", err)
		}

		job, err := q.GetJob(ctx, db.GetJobParams{ID: jobUUID, UserID: payload.UserID})
		if err != nil {
			return fmt.Errorf("get job: %w", err)
		}

		if !job.JdRaw.Valid || job.JdRaw.String == "" {
			return fmt.Errorf("job has no raw JD text")
		}

		// Load and render prompt
		promptTmpl, err := prompts.Get("jd_extract")
		if err != nil {
			return fmt.Errorf("load prompt: %w", err)
		}

		tmpl, err := template.New("jd_extract").Parse(promptTmpl)
		if err != nil {
			return fmt.Errorf("parse prompt template: %w", err)
		}

		var rendered strings.Builder
		if err := tmpl.Execute(&rendered, map[string]string{
			"Content": ai.Sanitise(job.JdRaw.String),
		}); err != nil {
			return fmt.Errorf("render prompt: %w", err)
		}

		// Call AI provider
		if deps.AIProvider == nil {
			return fmt.Errorf("AI provider not configured")
		}

		response, err := deps.AIProvider.Complete(ctx, ai.CompletionRequest{
			UserPrompt: rendered.String(),
		})
		if err != nil {
			return fmt.Errorf("AI completion: %w", err)
		}

		// Parse AI response
		var result JobExtractResult
		if err := json.Unmarshal([]byte(response), &result); err != nil {
			slog.Warn("failed to parse AI response", "response", response, "error", err)
			return fmt.Errorf("parse AI response: %w", err)
		}

		// Build jd_snapshot JSON
		snapshotJSON, err := json.Marshal(result)
		if err != nil {
			return fmt.Errorf("marshal jd_snapshot: %w", err)
		}

		// Build skills JSON
		skillsJSON, err := json.Marshal(result.Skills)
		if err != nil {
			return fmt.Errorf("marshal skills: %w", err)
		}

		// Update job
		_, err = q.UpdateJobJDSnapshot(ctx, db.UpdateJobJDSnapshotParams{
			ID:         jobUUID,
			UserID:     payload.UserID,
			JdSnapshot: snapshotJSON,
			Skills:     skillsJSON,
		})
		if err != nil {
			return fmt.Errorf("update job jd_snapshot: %w", err)
		}

		// SSE: job extracted
		publishSSE(deps.Redis, payload.UserID, "job_extracted", map[string]interface{}{
			"job_id":   payload.JobID,
			"snapshot": result,
		})

		slog.Info("JD extraction complete", "user_id", payload.UserID, "job_id", payload.JobID)

		return nil
	}
}
