package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
	"github.com/jobtopbob/jobtopbob/internal/email"
)

// GmailOAuthConnect handles GET /api/v1/email/oauth/connect
// Returns the OAuth consent URL for the user to authorize Gmail access.
func GmailOAuthConnect(provider email.Provider, masterKey []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := getUserID(c)

		state, err := services.GenerateOAuthState(masterKey, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
			return
		}

		url := provider.GetOAuthURL(state)
		c.JSON(http.StatusOK, gin.H{"url": url})
	}
}

// GmailOAuthCallback handles GET /api/v1/email/oauth/callback
// This is the redirect target from Google after the user grants consent.
// It is a PUBLIC route (no JWT middleware) — authentication is via the signed state parameter.
func GmailOAuthCallback(provider email.Provider, masterKey []byte, asynqClient *asynq.Client, frontendURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		code := c.Query("code")
		state := c.Query("state")

		if code == "" || state == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code or state"})
			return
		}

		// Validate state and extract user ID
		userID, err := services.ValidateOAuthState(masterKey, state)
		if err != nil {
			slog.Error("invalid oauth state", "error", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state"})
			return
		}

		// Exchange authorization code for tokens
		tokens, err := provider.ExchangeCode(c.Request.Context(), code)
		if err != nil {
			slog.Error("oauth code exchange failed", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code"})
			return
		}

		// Store encrypted tokens
		q := db.New(getTx(c))
		if err := services.StoreOAuthTokens(c.Request.Context(), q, masterKey, userID, provider, tokens); err != nil {
			slog.Error("failed to store tokens", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store tokens"})
			return
		}

		// Set up push notifications (watch)
		watchResult, err := provider.Watch(c.Request.Context(), tokens.AccessToken)
		if err != nil {
			slog.Error("failed to setup gmail watch", "error", err)
			// Non-fatal: tokens are stored, watch can be retried
		} else {
			// Store the initial history ID
			_ = q.UpdateOAuthHistoryID(c.Request.Context(), db.UpdateOAuthHistoryIDParams{
				UserID:         userID,
				Provider:       provider.Name(),
				GmailHistoryID: pgtype.Text{String: watchResult.HistoryID, Valid: true},
			})
		}

		// Enqueue initial email backfill task
		if asynqClient != nil {
			payload, _ := json.Marshal(map[string]string{"user_id": userID})
			task := asynq.NewTask("email:process", payload)
			if _, err := asynqClient.Enqueue(task); err != nil {
				slog.Error("failed to enqueue backfill task", "error", err)
			}
		}

		// Redirect to frontend settings page
		c.Redirect(http.StatusFound, frontendURL+"/settings?tab=integrations&gmail=connected")
	}
}

// GmailStatus handles GET /api/v1/email/status
// Returns whether Gmail is connected and the associated email address.
func GmailStatus(provider email.Provider) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		connected, emailAddr, err := services.GetConnectionStatus(c.Request.Context(), q, userID, provider.Name())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get status"})
			return
		}

		resp := gin.H{"connected": connected}
		if emailAddr != "" {
			resp["email"] = emailAddr
		}
		c.JSON(http.StatusOK, resp)
	}
}

// GmailDisconnect handles DELETE /api/v1/email/disconnect
// Revokes Gmail access and deletes all tokens and email events.
func GmailDisconnect(provider email.Provider, masterKey []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		if err := services.RevokeAndDeleteTokens(c.Request.Context(), q, masterKey, userID, provider); err != nil {
			slog.Error("failed to disconnect gmail", "error", err, "user_id", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to disconnect"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// pubSubMessage represents the push notification from Google Cloud Pub/Sub.
type pubSubMessage struct {
	Message struct {
		Data        string `json:"data"`
		MessageID   string `json:"messageId"`
		PublishTime string `json:"publishTime"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

// gmailNotification represents the decoded notification data from Gmail.
type gmailNotification struct {
	EmailAddress string `json:"emailAddress"`
	HistoryID    uint64 `json:"historyId"`
}

// GmailWebhook handles POST /api/v1/email/webhook
// Receives push notifications from Google Cloud Pub/Sub when new emails arrive.
// This is a PUBLIC route — called by Google, not by authenticated users.
func GmailWebhook(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var msg pubSubMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message"})
			return
		}

		// Decode the notification data
		data, err := base64.StdEncoding.DecodeString(msg.Message.Data)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid data encoding"})
			return
		}

		var notification gmailNotification
		if err := json.Unmarshal(data, &notification); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification"})
			return
		}

		slog.Info("gmail webhook received",
			"email", notification.EmailAddress,
			"history_id", notification.HistoryID,
		)

		// Enqueue processing task
		if asynqClient != nil {
			payload, _ := json.Marshal(map[string]interface{}{
				"email":      notification.EmailAddress,
				"history_id": notification.HistoryID,
			})
			task := asynq.NewTask("email:process", payload)
			if _, err := asynqClient.Enqueue(task); err != nil {
				slog.Error("failed to enqueue email process task", "error", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue"})
				return
			}
		}

		// Acknowledge the notification
		c.Status(http.StatusOK)
	}
}

// --- Email Events Handlers ---

// ListEmailEvents handles GET /api/v1/email/events
func ListEmailEvents() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, perPage := parsePagination(c)
		offset := (page - 1) * perPage

		events, err := q.ListEmailEvents(c.Request.Context(), db.ListEmailEventsParams{
			UserID: userID,
			Limit:  perPage,
			Offset: offset,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list events"})
			return
		}

		count, err := q.CountEmailEvents(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count events"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  events,
			"total": count,
			"page":  page,
		})
	}
}

// ListUnconfirmedEmailEvents handles GET /api/v1/email/events/unconfirmed
func ListUnconfirmedEmailEvents() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, perPage := parsePagination(c)
		offset := (page - 1) * perPage

		events, err := q.ListUnconfirmedEmailEvents(c.Request.Context(), db.ListUnconfirmedEmailEventsParams{
			UserID: userID,
			Limit:  perPage,
			Offset: offset,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list events"})
			return
		}

		count, err := q.CountUnconfirmedEmailEvents(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count events"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":  events,
			"total": count,
			"page":  page,
		})
	}
}

// CountUnconfirmedEmailEvents handles GET /api/v1/email/events/unconfirmed/count
func CountUnconfirmedEmailEvents() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		count, err := q.CountUnconfirmedEmailEvents(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to count events"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"count": count})
	}
}

// ConfirmEmailEvent handles POST /api/v1/email/events/:id/confirm
func ConfirmEmailEvent() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		event, err := q.ConfirmEmailEvent(c.Request.Context(), db.ConfirmEmailEventParams{
			ID:     id,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		c.JSON(http.StatusOK, event)
	}
}

// DismissEmailEvent handles POST /api/v1/email/events/:id/dismiss
func DismissEmailEvent() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		event, err := q.DismissEmailEvent(c.Request.Context(), db.DismissEmailEventParams{
			ID:     id,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "event not found"})
			return
		}

		c.JSON(http.StatusOK, event)
	}
}

// LinkEmailEventToJob handles PUT /api/v1/email/events/:id/job
func LinkEmailEventToJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req struct {
			JobID string `json:"job_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "job_id is required"})
			return
		}

		jobID := parseUUID(req.JobID)
		if !jobID.Valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id"})
			return
		}

		if err := q.UpdateEmailEventJobID(c.Request.Context(), db.UpdateEmailEventJobIDParams{
			ID:     id,
			JobID:  jobID,
			UserID: userID,
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to link job"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// parsePagination extracts page and per_page from query params with defaults.
func parsePagination(c *gin.Context) (int32, int32) {
	page := int32(1)
	perPage := int32(25)
	if p, err := parseInt32(c.DefaultQuery("page", "1")); err == nil && p > 0 {
		page = p
	}
	if pp, err := parseInt32(c.DefaultQuery("per_page", "25")); err == nil && pp > 0 && pp <= 100 {
		perPage = pp
	}
	return page, perPage
}

func parseInt32(s string) (int32, error) {
	var n int32
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}
