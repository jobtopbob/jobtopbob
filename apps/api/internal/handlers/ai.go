package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"text/template"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/ai"
	"github.com/jobtopbob/jobtopbob/internal/ai/prompts"
)

// maxGhostwriterMessages limits conversation history to keep within model context.
const maxGhostwriterMessages = 20

// streamAIResponse streams AI response chunks as SSE events to the client.
// Returns the accumulated full response text.
func streamAIResponse(c *gin.Context, provider ai.Provider, req ai.CompletionRequest) (string, error) {
	ch, err := provider.Stream(c.Request.Context(), req)
	if err != nil {
		return "", err
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	var full strings.Builder
	for chunk := range ch {
		if chunk.Done {
			c.SSEvent("done", "")
			c.Writer.Flush()
			break
		}
		full.WriteString(chunk.Delta)
		c.SSEvent("chunk", chunk.Delta)
		c.Writer.Flush()
	}
	return full.String(), nil
}

// renderPrompt loads a prompt template and renders it with the given data.
func renderPrompt(name string, data map[string]string) (string, error) {
	promptTmpl, err := prompts.Get(name)
	if err != nil {
		return "", fmt.Errorf("load prompt %q: %w", name, err)
	}
	tmpl, err := template.New(name).Parse(promptTmpl)
	if err != nil {
		return "", fmt.Errorf("parse prompt %q: %w", name, err)
	}
	var rendered strings.Builder
	if err := tmpl.Execute(&rendered, data); err != nil {
		return "", fmt.Errorf("render prompt %q: %w", name, err)
	}
	return rendered.String(), nil
}

// getJobAndResume fetches a job's JD text and the user's base resume text.
func getJobAndResume(c *gin.Context) (jdText, resumeText string, ok bool) {
	q := db.New(getTx(c))
	userID := getUserID(c)

	jobID, valid := parsePathUUID(c, "id")
	if !valid {
		return
	}

	job, err := q.GetJob(c.Request.Context(), db.GetJobParams{ID: jobID, UserID: userID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}

	if job.JdRaw.Valid && job.JdRaw.String != "" {
		jdText = job.JdRaw.String
	} else if len(job.JdSnapshot) > 0 {
		jdText = string(job.JdSnapshot)
	}
	if jdText == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "job has no description"})
		return
	}

	resume, err := q.GetBaseResume(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "no base resume set"})
		return
	}

	var parts []string
	if resume.FullName.Valid {
		parts = append(parts, "Name: "+resume.FullName.String)
	}
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
	if resumeText == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "base resume has no content"})
		return
	}

	ok = true
	return
}

// ExtractJob handles POST /api/v1/jobs/:id/extract
// Enqueues a job:extract background task.
func ExtractJob(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		jobID, valid := parsePathUUID(c, "id")
		if !valid {
			return
		}

		job, err := q.GetJob(c.Request.Context(), db.GetJobParams{ID: jobID, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}

		if !job.JdRaw.Valid || job.JdRaw.String == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "job has no raw description"})
			return
		}

		payload, _ := json.Marshal(map[string]string{
			"user_id": userID,
			"job_id":  uuidToString(jobID),
		})
		_, err = asynqClient.Enqueue(asynq.NewTask("job:extract", payload))
		if err != nil {
			slog.Error("failed to enqueue job:extract", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue extraction"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "queued"})
	}
}

// ScoreJob handles POST /api/v1/jobs/:id/score
// Enqueues a job:score background task.
func ScoreJob(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		jobID, valid := parsePathUUID(c, "id")
		if !valid {
			return
		}

		job, err := q.GetJob(c.Request.Context(), db.GetJobParams{ID: jobID, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}

		if !job.JdRaw.Valid || job.JdRaw.String == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "job has no raw description"})
			return
		}

		payload, _ := json.Marshal(map[string]string{
			"user_id": userID,
			"job_id":  uuidToString(jobID),
		})
		_, err = asynqClient.Enqueue(asynq.NewTask("job:score", payload))
		if err != nil {
			slog.Error("failed to enqueue job:score", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue scoring"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "queued"})
	}
}

// ATSScore handles POST /api/v1/jobs/:id/ats-score
// Streams ATS keyword match analysis.
func ATSScore(aiProvider ai.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		jdText, resumeText, ok := getJobAndResume(c)
		if !ok {
			return
		}

		prompt, err := renderPrompt("ats_score", map[string]string{
			"Resume":         ai.Sanitise(resumeText),
			"JobDescription": ai.Sanitise(jdText),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		_, err = streamAIResponse(c, aiProvider, ai.CompletionRequest{UserPrompt: prompt})
		if err != nil {
			slog.Error("ATS score stream failed", "error", err)
		}
	}
}

// TailorResume handles POST /api/v1/jobs/:id/tailor-resume
// Streams resume tailoring suggestions.
func TailorResume(aiProvider ai.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		jdText, resumeText, ok := getJobAndResume(c)
		if !ok {
			return
		}

		prompt, err := renderPrompt("tailor_resume", map[string]string{
			"Resume":         ai.Sanitise(resumeText),
			"JobDescription": ai.Sanitise(jdText),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		_, err = streamAIResponse(c, aiProvider, ai.CompletionRequest{UserPrompt: prompt})
		if err != nil {
			slog.Error("tailor resume stream failed", "error", err)
		}
	}
}

// GenerateCoverLetter handles POST /api/v1/jobs/:id/cover-letter
// Streams a cover letter and saves the result to job_assets.
func GenerateCoverLetter(aiProvider ai.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		jdText, resumeText, ok := getJobAndResume(c)
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)
		jobID, _ := parsePathUUID(c, "id")

		// Get writing style from user settings
		writingStyle := "professional"
		settings, err := q.GetUserSettings(c.Request.Context(), userID)
		if err == nil && settings.WritingStyle.Valid {
			writingStyle = settings.WritingStyle.String
		}

		prompt, err := renderPrompt("cover_letter", map[string]string{
			"Resume":         ai.Sanitise(resumeText),
			"JobDescription": ai.Sanitise(jdText),
			"WritingStyle":   writingStyle,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		fullText, err := streamAIResponse(c, aiProvider, ai.CompletionRequest{UserPrompt: prompt})
		if err != nil {
			slog.Error("cover letter stream failed", "error", err)
			return
		}

		// Save to job_assets after streaming completes
		if fullText != "" {
			_, err = q.CreateJobAsset(c.Request.Context(), db.CreateJobAssetParams{
				UserID:    userID,
				JobID:     jobID,
				Type:      pgtype.Text{String: "cover_letter", Valid: true},
				Content:   pgtype.Text{String: fullText, Valid: true},
				ModelUsed: pgtype.Text{},
			})
			if err != nil {
				slog.Error("failed to save cover letter asset", "error", err)
			}
		}
	}
}

// GenerateInterviewPrep handles POST /api/v1/jobs/:id/interview-prep
// Non-streaming — returns JSON and saves to job_assets.
func GenerateInterviewPrep(aiProvider ai.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		jdText, resumeText, ok := getJobAndResume(c)
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)
		jobID, _ := parsePathUUID(c, "id")

		prompt, err := renderPrompt("interview_prep", map[string]string{
			"Resume":         ai.Sanitise(resumeText),
			"JobDescription": ai.Sanitise(jdText),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		response, err := aiProvider.Complete(c.Request.Context(), ai.CompletionRequest{UserPrompt: prompt})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "AI completion failed"})
			return
		}

		// Save to job_assets
		_, err = q.CreateJobAsset(c.Request.Context(), db.CreateJobAssetParams{
			UserID:    userID,
			JobID:     jobID,
			Type:      pgtype.Text{String: "interview_prep", Valid: true},
			Content:   pgtype.Text{String: response, Valid: true},
			ModelUsed: pgtype.Text{},
		})
		if err != nil {
			slog.Error("failed to save interview prep asset", "error", err)
		}

		// Try to parse as JSON for clean response, fall back to raw
		var parsed json.RawMessage
		if json.Unmarshal([]byte(response), &parsed) == nil {
			c.Data(http.StatusOK, "application/json", parsed)
		} else {
			c.JSON(http.StatusOK, gin.H{"content": response})
		}
	}
}

// ListGhostwriterMessages handles GET /api/v1/jobs/:id/ghostwriter
func ListGhostwriterMessages() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		jobID, valid := parsePathUUID(c, "id")
		if !valid {
			return
		}

		messages, err := q.ListGhostwriterMessages(c.Request.Context(), db.ListGhostwriterMessagesParams{
			JobID:  jobID,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list messages"})
			return
		}

		c.JSON(http.StatusOK, messages)
	}
}

// SendGhostwriterMessage handles POST /api/v1/jobs/:id/ghostwriter
// Saves the user message, builds conversation context, streams AI response, saves assistant message.
func SendGhostwriterMessage(aiProvider ai.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		jobID, valid := parsePathUUID(c, "id")
		if !valid {
			return
		}

		var body struct {
			Message string `json:"message" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "message is required"})
			return
		}

		// Save user message
		_, err := q.CreateGhostwriterMessage(c.Request.Context(), db.CreateGhostwriterMessageParams{
			UserID:  userID,
			JobID:   jobID,
			Role:    pgtype.Text{String: "user", Valid: true},
			Content: pgtype.Text{String: body.Message, Valid: true},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save message"})
			return
		}

		// Load conversation history
		messages, err := q.ListGhostwriterMessages(c.Request.Context(), db.ListGhostwriterMessagesParams{
			JobID:  jobID,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load conversation"})
			return
		}

		// Get job context for system prompt
		job, err := q.GetJob(c.Request.Context(), db.GetJobParams{ID: jobID, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}

		jdContext := ""
		if job.JdRaw.Valid {
			jdContext = job.JdRaw.String
		}

		systemPrompt := "You are a helpful job search assistant. Help the user with their job application."
		if jdContext != "" {
			systemPrompt += "\n\nJob context:\n<user_content>" + ai.Sanitise(jdContext) + "</user_content>"
		}
		if job.Title != "" {
			systemPrompt += "\nJob title: " + job.Title
		}
		if job.CompanyName.Valid {
			systemPrompt += "\nCompany: " + job.CompanyName.String
		}

		// Build conversation as a multi-turn prompt (truncated to last N messages)
		var conversationParts []string
		start := 0
		if len(messages) > maxGhostwriterMessages {
			start = len(messages) - maxGhostwriterMessages
		}
		for _, msg := range messages[start:] {
			role := "User"
			if msg.Role.Valid && msg.Role.String == "assistant" {
				role = "Assistant"
			}
			if msg.Content.Valid {
				conversationParts = append(conversationParts, role+": "+msg.Content.String)
			}
		}

		userPrompt := strings.Join(conversationParts, "\n\n")

		// Stream AI response
		fullText, err := streamAIResponse(c, aiProvider, ai.CompletionRequest{
			SystemPrompt: systemPrompt,
			UserPrompt:   userPrompt,
		})
		if err != nil {
			slog.Error("ghostwriter stream failed", "error", err)
			return
		}

		// Save assistant message
		if fullText != "" {
			_, err = q.CreateGhostwriterMessage(c.Request.Context(), db.CreateGhostwriterMessageParams{
				UserID:  userID,
				JobID:   jobID,
				Role:    pgtype.Text{String: "assistant", Valid: true},
				Content: pgtype.Text{String: fullText, Valid: true},
			})
			if err != nil {
				slog.Error("failed to save assistant message", "error", err)
			}
		}
	}
}

// ListJobAssets handles GET /api/v1/jobs/:id/assets
func ListJobAssets() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		jobID, valid := parsePathUUID(c, "id")
		if !valid {
			return
		}

		assets, err := q.ListJobAssets(c.Request.Context(), db.ListJobAssetsParams{
			JobID:  jobID,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list assets"})
			return
		}

		c.JSON(http.StatusOK, assets)
	}
}

// DeleteJobAsset handles DELETE /api/v1/jobs/:id/assets/:assetId
func DeleteJobAsset() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		assetID, valid := parsePathUUID(c, "assetId")
		if !valid {
			return
		}

		result, err := q.DeleteJobAsset(c.Request.Context(), db.DeleteJobAssetParams{
			ID:     assetID,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete asset"})
			return
		}

		if result.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
