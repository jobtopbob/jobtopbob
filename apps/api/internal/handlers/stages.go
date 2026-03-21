package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListStages handles GET /api/v1/stages
func ListStages() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		stages, err := services.ListStages(c.Request.Context(), q, userID)
		if err != nil {
			slog.Error("failed to list stages", "error", err, "userID", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stages"})
			return
		}

		c.JSON(http.StatusOK, stages)
	}
}

type createStageRequest struct {
	Name         string  `json:"name" binding:"required"`
	Position     int32   `json:"position"`
	IsTerminal   *bool   `json:"is_terminal"`
	Color        *string `json:"color"`
	MappedStatus *string `json:"mapped_status"`
}

// CreateStage handles POST /api/v1/stages
func CreateStage() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createStageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateStageParams{
			Name:     req.Name,
			Position: req.Position,
		}
		if req.IsTerminal != nil {
			params.IsTerminal = pgtype.Bool{Bool: *req.IsTerminal, Valid: true}
		}
		if req.Color != nil {
			params.Color = pgtextValid(*req.Color)
		}
		if req.MappedStatus != nil {
			params.MappedStatus = pgtextValid(*req.MappedStatus)
		}

		stage, err := services.CreateStage(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create stage"})
			return
		}

		c.JSON(http.StatusCreated, stage)
	}
}

type updateStageRequest struct {
	Name         *string `json:"name"`
	IsTerminal   *bool   `json:"is_terminal"`
	Color        *string `json:"color"`
	MappedStatus *string `json:"mapped_status"`
}

// UpdateStage handles PUT /api/v1/stages/:id
func UpdateStage() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateStageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		var params db.UpdateStageParams
		if req.Name != nil {
			params.Name = pgtextValid(*req.Name)
		}
		if req.IsTerminal != nil {
			params.IsTerminal = pgtype.Bool{Bool: *req.IsTerminal, Valid: true}
		}
		if req.Color != nil {
			params.Color = pgtextValid(*req.Color)
		}
		if req.MappedStatus != nil {
			params.MappedStatus = pgtextValid(*req.MappedStatus)
		}

		stage, err := services.UpdateStage(c.Request.Context(), q, userID, id, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update stage"})
			return
		}

		c.JSON(http.StatusOK, stage)
	}
}

// DeleteStage handles DELETE /api/v1/stages/:id
func DeleteStage() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteStage(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete stage"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "stage not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

type reorderStagesRequest struct {
	Stages []services.ReorderStage `json:"stages" binding:"required"`
}

// ReorderStages handles PUT /api/v1/stages/reorder
func ReorderStages() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req reorderStagesRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		if err := services.ReorderStages(c.Request.Context(), q, userID, req.Stages); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reorder stages"})
			return
		}

		// Return updated list
		stages, err := services.ListStages(c.Request.Context(), q, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stages"})
			return
		}

		c.JSON(http.StatusOK, stages)
	}
}
