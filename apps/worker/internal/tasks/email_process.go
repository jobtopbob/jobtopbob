package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/mail"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/ai"
	"github.com/jobtopbob/jobtopbob/internal/ai/prompts"
	"github.com/jobtopbob/jobtopbob/internal/crypto"
	"github.com/jobtopbob/jobtopbob/internal/email"
)

// EmailProcessPayload is the payload for the email:process task.
type EmailProcessPayload struct {
	UserID    string `json:"user_id,omitempty"`
	Email     string `json:"email,omitempty"`
	HistoryID uint64 `json:"history_id,omitempty"`
}

// EmailProcessDeps holds dependencies for the email process task.
type EmailProcessDeps struct {
	Pool          *pgxpool.Pool
	MasterKey     []byte
	EmailProvider email.Provider
	AIProvider    ai.Provider
	Redis         *redis.Client
}

// HandleEmailProcess returns an Asynq handler for the email:process task.
// This task is triggered by the Gmail webhook when new emails arrive, or
// enqueued on initial connect for a 7-day backfill.
func HandleEmailProcess(deps *EmailProcessDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload EmailProcessPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("processing email task", "user_id", payload.UserID, "email", payload.Email)

		// Resolve user ID — webhook sends email address, backfill sends user_id
		userID := payload.UserID
		if userID == "" && payload.Email != "" {
			// Look up user by synced email
			q := db.New(deps.Pool)
			token, err := q.GetOAuthTokenByEmail(ctx, pgtype.Text{String: payload.Email, Valid: true})
			if err != nil {
				if err == pgx.ErrNoRows {
					slog.Warn("no user found for email", "email", payload.Email)
					return nil // Not an error — user may have disconnected
				}
				return fmt.Errorf("lookup user by email: %w", err)
			}
			userID = token.UserID
		}

		if userID == "" {
			return fmt.Errorf("no user_id or email in payload")
		}

		return processUserEmails(ctx, deps, userID)
	}
}

func processUserEmails(ctx context.Context, deps *EmailProcessDeps, userID string) error {
	q := db.New(deps.Pool)

	// Get the stored OAuth token
	tokenRow, err := q.GetOAuthToken(ctx, db.GetOAuthTokenParams{
		UserID:   userID,
		Provider: deps.EmailProvider.Name(),
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil // User disconnected
		}
		return fmt.Errorf("get token: %w", err)
	}

	// Decrypt the access token
	accessToken, refreshToken, _, err := decryptTokens(deps.MasterKey, userID, tokenRow)
	if err != nil {
		return fmt.Errorf("decrypt tokens: %w", err)
	}

	// Check if token needs refresh
	if tokenRow.ExpiresAt.Valid && time.Now().After(tokenRow.ExpiresAt.Time) {
		refreshed, err := deps.EmailProvider.RefreshToken(ctx, refreshToken)
		if err != nil {
			slog.Error("token refresh failed", "user_id", userID, "error", err)
			return nil // Skip this user — don't retry a failed refresh
		}
		accessToken = refreshed.AccessToken

		// Re-encrypt and store refreshed token
		encAccess, _ := crypto.Encrypt(deps.MasterKey, userID, refreshed.AccessToken)
		encRefresh := ""
		if refreshed.RefreshToken != "" {
			encRefresh, _ = crypto.Encrypt(deps.MasterKey, userID, refreshed.RefreshToken)
		}

		_, _ = q.UpsertOAuthToken(ctx, db.UpsertOAuthTokenParams{
			UserID:       userID,
			Provider:     deps.EmailProvider.Name(),
			AccessToken:  pgtype.Text{String: encAccess, Valid: true},
			RefreshToken: pgtype.Text{String: encRefresh, Valid: encRefresh != ""},
			TokenType:    tokenRow.TokenType,
			Scope:        tokenRow.Scope,
			ExpiresAt:    pgtype.Timestamptz{Time: refreshed.ExpiresAt, Valid: !refreshed.ExpiresAt.IsZero()},
		})
	}

	// Fetch new emails
	historyCursor := ""
	if tokenRow.GmailHistoryID.Valid {
		historyCursor = tokenRow.GmailHistoryID.String
	}

	emails, newCursor, err := deps.EmailProvider.FetchNewEmails(ctx, accessToken, historyCursor)
	if err != nil {
		return fmt.Errorf("fetch emails: %w", err)
	}

	slog.Info("fetched emails", "user_id", userID, "count", len(emails))

	// Load the classification prompt
	promptTemplate, err := prompts.Get("email_classify")
	if err != nil {
		return fmt.Errorf("load prompt: %w", err)
	}

	// Process each email
	for _, rawEmail := range emails {
		if err := processEmail(ctx, deps, q, userID, rawEmail, promptTemplate); err != nil {
			slog.Error("failed to process email", "user_id", userID, "message_id", rawEmail.MessageID, "error", err)
			continue // Skip individual failures
		}
	}

	// Update history cursor
	if newCursor != "" {
		_ = q.UpdateOAuthHistoryID(ctx, db.UpdateOAuthHistoryIDParams{
			UserID:         userID,
			Provider:       deps.EmailProvider.Name(),
			GmailHistoryID: pgtype.Text{String: newCursor, Valid: true},
		})
	}

	return nil
}

func processEmail(ctx context.Context, deps *EmailProcessDeps, q *db.Queries, userID string, rawEmail email.RawEmail, promptTemplate string) error {
	// Check if we've already processed this message (idempotency)
	_, err := q.GetEmailEventByMessageID(ctx, db.GetEmailEventByMessageIDParams{
		UserID:         userID,
		GmailMessageID: pgtype.Text{String: rawEmail.MessageID, Valid: true},
	})
	if err == nil {
		return nil // Already processed
	}
	if err != pgx.ErrNoRows {
		return fmt.Errorf("check duplicate: %w", err)
	}

	// Build the prompt with email content
	prompt := strings.NewReplacer(
		"{{.Subject}}", rawEmail.Subject,
		"{{.From}}", rawEmail.From,
		"{{.Date}}", rawEmail.Date.Format(time.RFC1123Z),
		"{{.Body}}", rawEmail.Body,
	).Replace(promptTemplate)

	// Call AI provider for classification
	result, err := deps.AIProvider.Complete(ctx, ai.CompletionRequest{
		UserPrompt:  prompt,
		MaxTokens:   500,
		Temperature: 0.1,
	})
	if err != nil {
		return fmt.Errorf("ai classify: %w", err)
	}

	// Parse the AI response
	var classification struct {
		Intent        string  `json:"intent"`
		CompanyName   string  `json:"company_name"`
		CompanyDomain string  `json:"company_domain"`
		Confidence    float64 `json:"confidence"`
		Snippet       string  `json:"snippet"`
	}
	if err := json.Unmarshal([]byte(result), &classification); err != nil {
		slog.Warn("failed to parse AI response", "response", result, "error", err)
		return nil // Skip unparseable responses
	}

	// Skip low-confidence or "other" classifications
	if classification.Intent == "other" || classification.Confidence < 0.5 {
		return nil
	}

	// Try to match sender to a company/job in the user's tracker
	jobID := matchEmailToJob(ctx, q, userID, rawEmail.From, classification.CompanyName)

	// Store the email event
	event, err := q.CreateEmailEvent(ctx, db.CreateEmailEventParams{
		UserID:         userID,
		JobID:          jobID,
		GmailMessageID: pgtype.Text{String: rawEmail.MessageID, Valid: true},
		DetectedType:   pgtype.Text{String: classification.Intent, Valid: true},
		Confidence:     pgtype.Float8{Float64: classification.Confidence, Valid: true},
		RawSnippet:     pgtype.Text{String: classification.Snippet, Valid: classification.Snippet != ""},
	})
	if err != nil {
		return fmt.Errorf("create event: %w", err)
	}

	// Publish SSE notification
	if deps.Redis != nil {
		ssePayload, _ := json.Marshal(map[string]interface{}{
			"type": "email_event",
			"data": map[string]interface{}{
				"id":            event.ID,
				"detected_type": classification.Intent,
				"confidence":    classification.Confidence,
				"company_name":  classification.CompanyName,
				"snippet":       classification.Snippet,
			},
		})
		deps.Redis.Publish(ctx, fmt.Sprintf("sse:%s", userID), string(ssePayload))
	}

	return nil
}

// personalEmailDomains are domains that indicate a personal email, not a company sender.
var personalEmailDomains = map[string]bool{
	"gmail.com":      true,
	"googlemail.com": true,
	"outlook.com":    true,
	"hotmail.com":    true,
	"yahoo.com":      true,
	"aol.com":        true,
	"protonmail.com": true,
	"proton.me":      true,
	"icloud.com":     true,
	"me.com":         true,
	"mail.com":       true,
	"live.com":       true,
	"msn.com":        true,
	"ymail.com":      true,
	"zoho.com":       true,
}

// matchEmailToJob attempts to match a sender email/company name to an existing
// company and job in the user's tracker. If no company exists, it auto-creates one.
func matchEmailToJob(ctx context.Context, q *db.Queries, userID string, fromHeader string, companyName string) pgtype.UUID {
	senderDomain := extractDomain(fromHeader)

	// Skip personal email domains
	if personalEmailDomains[senderDomain] {
		senderDomain = ""
	}

	if senderDomain == "" && companyName == "" {
		return pgtype.UUID{}
	}

	// 1. Try domain match
	var companyID pgtype.UUID
	if senderDomain != "" {
		company, err := q.FindCompanyByDomain(ctx, db.FindCompanyByDomainParams{
			UserID: userID,
			Domain: pgtype.Text{String: senderDomain, Valid: true},
		})
		if err == nil {
			companyID = company.ID
		}
	}

	// 2. Fallback: try name match
	if !companyID.Valid && companyName != "" {
		matches, err := q.FindCompanyByNameFuzzy(ctx, db.FindCompanyByNameFuzzyParams{
			UserID: userID,
			Lower:  companyName,
		})
		if err == nil && len(matches) > 0 {
			companyID = matches[0].ID

			// Backfill domain if the matched company doesn't have one yet
			if !matches[0].Domain.Valid && senderDomain != "" {
				_, _ = q.UpdateCompany(ctx, db.UpdateCompanyParams{
					ID:     matches[0].ID,
					UserID: userID,
					Domain: pgtype.Text{String: senderDomain, Valid: true},
				})
			}
		}
	}

	// 3. Auto-create company if we have a name but no match
	if !companyID.Valid && companyName != "" {
		newCompany, err := q.CreateCompany(ctx, db.CreateCompanyParams{
			UserID:     userID,
			Name:       companyName,
			Domain:     pgtype.Text{String: senderDomain, Valid: senderDomain != ""},
			DataSource: "email",
		})
		if err != nil {
			slog.Warn("failed to auto-create company from email", "company", companyName, "error", err)
		} else {
			companyID = newCompany.ID
			slog.Info("auto-created company from email", "company", companyName, "domain", senderDomain, "id", newCompany.ID)
		}
	}

	// 4. Find the most recent open job for this company
	if companyID.Valid {
		job, err := q.FindMostRecentJobByCompany(ctx, db.FindMostRecentJobByCompanyParams{
			UserID:    userID,
			CompanyID: companyID,
		})
		if err == nil {
			return job
		}
	}

	return pgtype.UUID{}
}

// extractDomain extracts the domain from an email From header.
func extractDomain(fromHeader string) string {
	addr, err := mail.ParseAddress(fromHeader)
	if err != nil {
		// Try to find @ in the raw string
		if idx := strings.LastIndex(fromHeader, "@"); idx >= 0 {
			domain := fromHeader[idx+1:]
			domain = strings.TrimRight(domain, "> ")
			return strings.ToLower(domain)
		}
		return ""
	}
	parts := strings.SplitN(addr.Address, "@", 2)
	if len(parts) != 2 {
		return ""
	}
	return strings.ToLower(parts[1])
}

func decryptTokens(masterKey []byte, userID string, row db.OauthToken) (accessToken, refreshToken string, expiresAt time.Time, err error) {
	if row.AccessToken.Valid {
		accessToken, err = crypto.Decrypt(masterKey, userID, row.AccessToken.String)
		if err != nil {
			return "", "", time.Time{}, fmt.Errorf("decrypt access token: %w", err)
		}
	}
	if row.RefreshToken.Valid {
		refreshToken, err = crypto.Decrypt(masterKey, userID, row.RefreshToken.String)
		if err != nil {
			return "", "", time.Time{}, fmt.Errorf("decrypt refresh token: %w", err)
		}
	}
	if row.ExpiresAt.Valid {
		expiresAt = row.ExpiresAt.Time
	}
	return
}
