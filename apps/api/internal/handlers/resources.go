package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListResources handles GET /api/v1/resources
func ListResources() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "12"))

		result, err := services.ListResources(c.Request.Context(), q, userID, services.ListResourcesParams{
			Types:      splitCSV(c.Query("types")),
			Categories: splitCSV(c.Query("categories")),
			Search:     pgtextValid(c.Query("search")),
			SortBy:     c.DefaultQuery("sort_by", "created_at"),
			SortOrder:  c.DefaultQuery("sort_order", "desc"),
			Page:       int32(page),
			PerPage:    int32(perPage),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list resources"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetResource handles GET /api/v1/resources/:id
func GetResource() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resource, err := services.GetResource(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get resource"})
			return
		}

		c.JSON(http.StatusOK, resource)
	}
}

type createResourceRequest struct {
	Title       string `json:"title" binding:"required"`
	URL         string `json:"url"`
	Type        string `json:"type"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Content     string `json:"content"`
	Pinned      bool   `json:"pinned"`
}

// CreateResource handles POST /api/v1/resources
func CreateResource() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createResourceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resType := req.Type
		if resType == "" {
			resType = "link"
		}

		resource, err := services.CreateResource(c.Request.Context(), q, userID, db.CreateResourceParams{
			Title:       req.Title,
			Url:         pgtextValid(req.URL),
			Type:        resType,
			Category:    pgtextValid(req.Category),
			Description: pgtextValid(req.Description),
			Content:     pgtextValid(req.Content),
			Pinned:      req.Pinned,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create resource"})
			return
		}

		c.JSON(http.StatusCreated, resource)
	}
}

type updateResourceRequest struct {
	Title       *string `json:"title"`
	URL         *string `json:"url"`
	Type        *string `json:"type"`
	Category    *string `json:"category"`
	Description *string `json:"description"`
	Content     *string `json:"content"`
	Pinned      *bool   `json:"pinned"`
}

// UpdateResource handles PUT /api/v1/resources/:id
func UpdateResource() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateResourceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		var params db.UpdateResourceParams
		if req.Title != nil {
			params.Title = pgtextValid(*req.Title)
		}
		if req.URL != nil {
			params.Url = pgtextValid(*req.URL)
		}
		if req.Type != nil {
			params.Type = pgtextValid(*req.Type)
		}
		if req.Category != nil {
			params.Category = pgtextValid(*req.Category)
		}
		if req.Description != nil {
			params.Description = pgtextValid(*req.Description)
		}
		if req.Content != nil {
			params.Content = pgtextValid(*req.Content)
		}
		if req.Pinned != nil {
			params.Pinned = pgtype.Bool{Bool: *req.Pinned, Valid: true}
		}

		resource, err := services.UpdateResource(c.Request.Context(), q, userID, id, params)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update resource"})
			return
		}

		c.JSON(http.StatusOK, resource)
	}
}

// DeleteResource handles DELETE /api/v1/resources/:id
func DeleteResource() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteResource(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete resource"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// ToggleResourcePin handles POST /api/v1/resources/:id/pin
func ToggleResourcePin() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resource, err := services.ToggleResourcePin(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resource not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to toggle pin"})
			return
		}

		c.JSON(http.StatusOK, resource)
	}
}
