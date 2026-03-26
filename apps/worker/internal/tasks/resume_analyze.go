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

const TypeResumeAnalyze = "resume:analyze"

// ResumeAnalyzePayload is the payload for the resume:analyze task.
type ResumeAnalyzePayload struct {
	UserID          string `json:"user_id"`
	SearchProfileID string `json:"search_profile_id"`
	ResumeID        string `json:"resume_id,omitempty"`
	ResumeText      string `json:"resume_text,omitempty"`
}

// ResumeAnalyzeResult is the structured output from AI analysis.
type ResumeAnalyzeResult struct {
	TargetRoles         []string `json:"target_roles"`
	Skills              []string `json:"skills"`
	Industries          []string `json:"industries"`
	ExperienceLevel     string   `json:"experience_level"`
	LocationPreferences []string `json:"location_preferences"`
	Keywords            []string `json:"keywords"`
}

// ResumeAnalyzeDeps holds dependencies for the resume:analyze task.
type ResumeAnalyzeDeps struct {
	Pool       *pgxpool.Pool
	Redis      *redis.Client
	AIProvider ai.Provider
}

// HandleResumeAnalyze returns an Asynq handler for the resume:analyze task.
func HandleResumeAnalyze(deps *ResumeAnalyzeDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload ResumeAnalyzePayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("analyzing resume", "user_id", payload.UserID, "search_profile_id", payload.SearchProfileID)

		q := db.New(deps.Pool)

		// Get resume text — either from payload or from existing resume metadata
		resumeText := payload.ResumeText
		if resumeText == "" && payload.ResumeID != "" {
			var resumeUUID pgtype.UUID
			if err := resumeUUID.Scan(payload.ResumeID); err != nil {
				return fmt.Errorf("parse resume_id: %w", err)
			}
			resume, err := q.GetResume(ctx, db.GetResumeParams{ID: resumeUUID, UserID: payload.UserID})
			if err != nil {
				return fmt.Errorf("get resume: %w", err)
			}
			// Build a text summary from resume metadata
			var parts []string
			if resume.Headline.Valid {
				parts = append(parts, "Headline: "+resume.Headline.String)
			}
			if resume.LatestRole.Valid {
				parts = append(parts, "Latest Role: "+resume.LatestRole.String)
			}
			if len(resume.TopSkills) > 0 {
				parts = append(parts, "Skills: "+strings.Join(resume.TopSkills, ", "))
			}
			resumeText = strings.Join(parts, "\n")
		}

		if resumeText == "" {
			return fmt.Errorf("no resume content available")
		}

		// Load and render prompt
		promptTmpl, err := prompts.Get("resume_analyze")
		if err != nil {
			return fmt.Errorf("load prompt: %w", err)
		}

		tmpl, err := template.New("resume_analyze").Parse(promptTmpl)
		if err != nil {
			return fmt.Errorf("parse prompt template: %w", err)
		}

		var rendered strings.Builder
		if err := tmpl.Execute(&rendered, map[string]string{"Content": resumeText}); err != nil {
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
		var result ResumeAnalyzeResult
		if err := json.Unmarshal([]byte(response), &result); err != nil {
			slog.Warn("failed to parse AI response, trying to extract JSON", "response", response, "error", err)
			return fmt.Errorf("parse AI response: %w", err)
		}

		// Update the search profile with extracted data
		var profileUUID pgtype.UUID
		if err := profileUUID.Scan(payload.SearchProfileID); err != nil {
			return fmt.Errorf("parse search_profile_id: %w", err)
		}

		_, err = q.UpdateSearchProfile(ctx, db.UpdateSearchProfileParams{
			ID:              profileUUID,
			UserID:          payload.UserID,
			Keywords:        result.Keywords,
			Skills:          result.Skills,
			TargetRoles:     result.TargetRoles,
			ExperienceLevel: pgtype.Text{String: result.ExperienceLevel, Valid: result.ExperienceLevel != ""},
		})
		if err != nil {
			return fmt.Errorf("update search profile: %w", err)
		}

		// SSE: resume analyzed
		publishSSE(deps.Redis, payload.UserID, "resume_analyzed", map[string]interface{}{
			"search_profile_id": payload.SearchProfileID,
			"target_roles":      result.TargetRoles,
			"skills":            result.Skills,
			"experience_level":  result.ExperienceLevel,
			"keywords":          result.Keywords,
		})

		slog.Info("resume analysis complete",
			"user_id", payload.UserID,
			"search_profile_id", payload.SearchProfileID,
			"target_roles", result.TargetRoles,
		)

		return nil
	}
}
