package handlers

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
)

var (
	validAIProviders  = []string{"openai", "anthropic", "gemini", "ollama"}
	validWriteStyles  = []string{"professional", "conversational", "formal"}
)

type userSettingsResponse struct {
	AIProvider   *string `json:"ai_provider"`
	AIModel      *string `json:"ai_model"`
	WritingStyle *string `json:"writing_style"`
	WeeklyGoal   *int32  `json:"weekly_goal"`
}

func settingsRowToResponse(row db.GetUserSettingsRow) userSettingsResponse {
	resp := userSettingsResponse{}
	if row.AiProvider.Valid {
		resp.AIProvider = &row.AiProvider.String
	}
	if row.AiModel.Valid {
		resp.AIModel = &row.AiModel.String
	}
	if row.WritingStyle.Valid {
		resp.WritingStyle = &row.WritingStyle.String
	}
	if row.WeeklyGoal.Valid {
		resp.WeeklyGoal = &row.WeeklyGoal.Int32
	}
	return resp
}

func upsertRowToResponse(row db.UpsertUserSettingsRow) userSettingsResponse {
	resp := userSettingsResponse{}
	if row.AiProvider.Valid {
		resp.AIProvider = &row.AiProvider.String
	}
	if row.AiModel.Valid {
		resp.AIModel = &row.AiModel.String
	}
	if row.WritingStyle.Valid {
		resp.WritingStyle = &row.WritingStyle.String
	}
	if row.WeeklyGoal.Valid {
		resp.WeeklyGoal = &row.WeeklyGoal.Int32
	}
	return resp
}

// GetUserSettings handles GET /api/v1/settings
func GetUserSettings() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		row, err := q.GetUserSettings(c.Request.Context(), userID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				c.JSON(http.StatusOK, userSettingsResponse{})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get settings"})
			return
		}

		c.JSON(http.StatusOK, settingsRowToResponse(row))
	}
}

type updateUserSettingsRequest struct {
	AIProvider   *string `json:"ai_provider"`
	AIModel      *string `json:"ai_model"`
	WritingStyle *string `json:"writing_style"`
	WeeklyGoal   *int32  `json:"weekly_goal"`
}

// UpdateUserSettings handles PUT /api/v1/settings
func UpdateUserSettings() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req updateUserSettingsRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validate ai_provider
		if req.AIProvider != nil && *req.AIProvider != "" {
			if !slices.Contains(validAIProviders, *req.AIProvider) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ai_provider, must be one of: openai, anthropic, gemini, ollama"})
				return
			}
		}

		// Validate writing_style
		if req.WritingStyle != nil && *req.WritingStyle != "" {
			if !slices.Contains(validWriteStyles, *req.WritingStyle) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid writing_style, must be one of: professional, conversational, formal"})
				return
			}
		}

		// Validate weekly_goal
		if req.WeeklyGoal != nil && *req.WeeklyGoal < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "weekly_goal must be >= 0"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.UpsertUserSettingsParams{
			UserID: userID,
		}
		if req.AIProvider != nil {
			params.AiProvider = pgtype.Text{String: *req.AIProvider, Valid: *req.AIProvider != ""}
		}
		if req.AIModel != nil {
			params.AiModel = pgtype.Text{String: *req.AIModel, Valid: *req.AIModel != ""}
		}
		if req.WritingStyle != nil {
			params.WritingStyle = pgtype.Text{String: *req.WritingStyle, Valid: *req.WritingStyle != ""}
		}
		if req.WeeklyGoal != nil {
			params.WeeklyGoal = pgtype.Int4{Int32: *req.WeeklyGoal, Valid: true}
		}

		row, err := q.UpsertUserSettings(c.Request.Context(), params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update settings"})
			return
		}

		c.JSON(http.StatusOK, upsertRowToResponse(row))
	}
}
