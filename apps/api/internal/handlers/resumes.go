package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

// ListResumes handles GET /api/v1/resumes
func ListResumes(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		resumes, err := services.ListResumes(c.Request.Context(), q, userID, rxClient)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list resumes"})
			return
		}

		c.JSON(http.StatusOK, resumes)
	}
}

type createResumeRequest struct {
	Name           string `json:"name" binding:"required"`
	Template       string `json:"template"`
	WithSampleData bool   `json:"with_sample_data"`
}

// CreateResume handles POST /api/v1/resumes
func CreateResume(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createResumeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resume, err := services.CreateResume(c.Request.Context(), q, userID, rxClient, services.CreateResumeParams{
			Name:           req.Name,
			Template:       req.Template,
			WithSampleData: req.WithSampleData,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create resume"})
			return
		}

		c.JSON(http.StatusCreated, resume)
	}
}

// GetResume handles GET /api/v1/resumes/:id
func GetResume(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resume, err := services.GetResume(c.Request.Context(), q, userID, rxClient, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get resume"})
			return
		}

		c.JSON(http.StatusOK, resume)
	}
}

type updateResumeRequest struct {
	Name   *string `json:"name"`
	IsBase *bool   `json:"is_base"`
}

// UpdateResume handles PUT /api/v1/resumes/:id
func UpdateResume(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateResumeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resume, err := services.UpdateResume(c.Request.Context(), q, userID, id, services.UpdateResumeParams{
			Name:   req.Name,
			IsBase: req.IsBase,
		})
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update resume"})
			return
		}

		c.JSON(http.StatusOK, resume)
	}
}

// DeleteResume handles DELETE /api/v1/resumes/:id
func DeleteResume(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		err := services.DeleteResume(c.Request.Context(), q, userID, rxClient, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete resume"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// ExportResumePDF handles GET /api/v1/resumes/:id/pdf
func ExportResumePDF(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		url, err := services.ExportResumePDF(c.Request.Context(), q, userID, rxClient, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export pdf"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": url})
	}
}

// SyncResumes handles POST /api/v1/resumes/sync
func SyncResumes(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		resumes, err := services.SyncResumes(c.Request.Context(), q, userID, rxClient)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sync resumes"})
			return
		}

		c.JSON(http.StatusOK, resumes)
	}
}

// SetBaseResume handles PUT /api/v1/resumes/:id/base
func SetBaseResume() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		resume, err := services.SetBaseResume(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set base resume"})
			return
		}

		c.JSON(http.StatusOK, resume)
	}
}
