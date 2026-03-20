package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListTags handles GET /api/v1/tags
func ListTags() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		tags, err := services.ListTags(c.Request.Context(), q, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tags"})
			return
		}

		c.JSON(http.StatusOK, tags)
	}
}

type createTagRequest struct {
	Name  string `json:"name" binding:"required"`
	Color string `json:"color"`
}

// CreateTag handles POST /api/v1/tags
func CreateTag() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createTagRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		tag, err := services.CreateTag(c.Request.Context(), q, userID, req.Name, req.Color)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tag"})
			return
		}

		c.JSON(http.StatusCreated, tag)
	}
}

// DeleteTag handles DELETE /api/v1/tags/:id
func DeleteTag() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteTag(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete tag"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "tag not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

type assignTagRequest struct {
	TagID string `json:"tag_id" binding:"required"`
}

// AssignJobTag handles POST /api/v1/jobs/:id/tags
func AssignJobTag() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req assignTagRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)
		tagID := parseUUID(req.TagID)

		if err := services.AssignTag(c.Request.Context(), q, userID, tagID, "job", jobID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to assign tag"})
			return
		}

		c.Status(http.StatusCreated)
	}
}

// RemoveJobTag handles DELETE /api/v1/jobs/:id/tags/:tagId
func RemoveJobTag() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}
		tagID, ok := parsePathUUID(c, "tagId")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		_, err := services.RemoveTag(c.Request.Context(), q, userID, tagID, "job", jobID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove tag"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}
