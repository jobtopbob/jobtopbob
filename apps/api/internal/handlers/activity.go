package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

type activityLogResponse struct {
	ID         pgtype.UUID        `json:"id"`
	UserID     string             `json:"user_id"`
	EntityType pgtype.Text        `json:"entity_type"`
	EntityID   pgtype.UUID        `json:"entity_id"`
	Action     pgtype.Text        `json:"action"`
	OldValue   json.RawMessage    `json:"old_value"`
	NewValue   json.RawMessage    `json:"new_value"`
	CreatedAt  pgtype.Timestamptz `json:"created_at"`
}

func toActivityResponse(entry db.ActivityLog) activityLogResponse {
	resp := activityLogResponse{
		ID:         entry.ID,
		UserID:     entry.UserID,
		EntityType: entry.EntityType,
		EntityID:   entry.EntityID,
		Action:     entry.Action,
		CreatedAt:  entry.CreatedAt,
	}
	if len(entry.OldValue) > 0 {
		resp.OldValue = json.RawMessage(entry.OldValue)
	}
	if len(entry.NewValue) > 0 {
		resp.NewValue = json.RawMessage(entry.NewValue)
	}
	return resp
}

// GetJobActivity handles GET /api/v1/jobs/:id/activity
func GetJobActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		entries, err := services.ListActivityForEntity(c.Request.Context(), q, userID, "job", jobID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list activity"})
			return
		}

		resp := make([]activityLogResponse, len(entries))
		for i, entry := range entries {
			resp[i] = toActivityResponse(entry)
		}

		c.JSON(http.StatusOK, resp)
	}
}
