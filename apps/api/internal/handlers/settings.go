package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

type setRxResumeKeyRequest struct {
	APIKey string `json:"api_key" binding:"required"`
}

// SetRxResumeKey handles PUT /api/v1/settings/rxresume-key
// Validates the key against RxResume before storing it.
func SetRxResumeKey(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req setRxResumeKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate the key by calling the RxResume API
		if err := rxClient.ValidateAPIKey(c.Request.Context(), req.APIKey); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid API key — could not connect to Resume Builder"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		if err := q.SetRxResumeAPIKey(c.Request.Context(), db.SetRxResumeAPIKeyParams{
			UserID:         userID,
			RxresumeApiKey: pgtype.Text{String: req.APIKey, Valid: true},
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"connected": true})
	}
}

// DeleteRxResumeKey handles DELETE /api/v1/settings/rxresume-key
func DeleteRxResumeKey() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		if err := q.ClearRxResumeAPIKey(c.Request.Context(), userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"connected": false})
	}
}

// GetRxResumeKeyStatus handles GET /api/v1/settings/rxresume-key/status
func GetRxResumeKeyStatus() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		key, err := q.GetRxResumeAPIKey(c.Request.Context(), userID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check API key status"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"connected": key.Valid && key.String != ""})
	}
}
