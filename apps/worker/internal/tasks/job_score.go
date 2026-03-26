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

// JobScorePayload is the payload for the job:score task.
type JobScorePayload struct {
	UserID string `json:"user_id"`
	JobID  string `json:"job_id"`
}

// JobScoreResult is the structured output from AI suitability scoring.
type JobScoreResult struct {
	Score     int      `json:"score"`
	Reason    string   `json:"reason"`
	Strengths []string `json:"strengths"`
	Gaps      []string `json:"gaps"`
}

// JobScoreDeps holds dependencies for the job:score task.
type JobScoreDeps struct {
	Pool       *pgxpool.Pool
	Redis      *redis.Client
	AIProvider ai.Provider
}

// HandleJobScore returns an Asynq handler for the job:score task.
func HandleJobScore(deps *JobScoreDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload JobScorePayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("scoring job suitability", "user_id", payload.UserID, "job_id", payload.JobID)

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

		// Build JD text from raw or snapshot
		jdText := ""
		if job.JdRaw.Valid && job.JdRaw.String != "" {
			jdText = job.JdRaw.String
		} else if len(job.JdSnapshot) > 0 {
			jdText = string(job.JdSnapshot)
		}
		if jdText == "" {
			return fmt.Errorf("job has no JD content")
		}

		// Get user's base resume for comparison
		resume, err := q.GetBaseResume(ctx, payload.UserID)
		if err != nil {
			return fmt.Errorf("get base resume: %w", err)
		}

		// Build resume text summary from metadata
		var resumeParts []string
		if resume.FullName.Valid {
			resumeParts = append(resumeParts, "Name: "+resume.FullName.String)
		}
		if resume.Headline.Valid {
			resumeParts = append(resumeParts, "Headline: "+resume.Headline.String)
		}
		if resume.LatestRole.Valid {
			resumeParts = append(resumeParts, "Latest Role: "+resume.LatestRole.String)
		}
		if len(resume.TopSkills) > 0 {
			resumeParts = append(resumeParts, "Skills: "+strings.Join(resume.TopSkills, ", "))
		}
		resumeText := strings.Join(resumeParts, "\n")
		if resumeText == "" {
			return fmt.Errorf("base resume has no content")
		}

		// Load and render prompt
		promptTmpl, err := prompts.Get("suitability")
		if err != nil {
			return fmt.Errorf("load prompt: %w", err)
		}

		tmpl, err := template.New("suitability").Parse(promptTmpl)
		if err != nil {
			return fmt.Errorf("parse prompt template: %w", err)
		}

		var rendered strings.Builder
		if err := tmpl.Execute(&rendered, map[string]string{
			"Resume":         ai.Sanitise(resumeText),
			"JobDescription": ai.Sanitise(jdText),
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
		var result JobScoreResult
		if err := json.Unmarshal([]byte(response), &result); err != nil {
			slog.Warn("failed to parse AI response", "response", response, "error", err)
			return fmt.Errorf("parse AI response: %w", err)
		}

		// Update job suitability
		_, err = q.UpdateJobSuitability(ctx, db.UpdateJobSuitabilityParams{
			ID:                jobUUID,
			UserID:            payload.UserID,
			Suitability:       pgtype.Int4{Int32: int32(result.Score), Valid: true},
			SuitabilityReason: pgtype.Text{String: result.Reason, Valid: true},
		})
		if err != nil {
			return fmt.Errorf("update job suitability: %w", err)
		}

		// SSE: job scored
		publishSSE(deps.Redis, payload.UserID, "job_scored", map[string]interface{}{
			"job_id":    payload.JobID,
			"score":     result.Score,
			"reason":    result.Reason,
			"strengths": result.Strengths,
			"gaps":      result.Gaps,
		})

		slog.Info("job scoring complete",
			"user_id", payload.UserID,
			"job_id", payload.JobID,
			"score", result.Score,
		)

		return nil
	}
}
