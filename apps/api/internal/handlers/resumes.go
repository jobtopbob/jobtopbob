package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

// getUserRxAPIKey reads the user's stored RxResume API key from user_settings.
// Returns empty string if not configured.
func getUserRxAPIKey(c *gin.Context) string {
	q := db.New(getTx(c))
	userID := getUserID(c)
	key, err := q.GetRxResumeAPIKey(c.Request.Context(), userID)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			slog.Warn("failed to read rxresume api key", "user_id", userID, "error", err)
		}
		return ""
	}
	return key.String
}

// GetResumeConfig handles GET /api/v1/resumes/config
func GetResumeConfig(rxClient *rxresume.Client, builderPublicURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := getUserRxAPIKey(c)
		config := services.GetResumeConfig(rxClient, builderPublicURL, apiKey != "")
		c.JSON(http.StatusOK, config)
	}
}

// ListResumes handles GET /api/v1/resumes
func ListResumes(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		userAPIKey := getUserRxAPIKey(c)

		resumes, err := services.ListResumes(c.Request.Context(), q, userID, userAPIKey, rxClient)
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
		userAPIKey := getUserRxAPIKey(c)

		resume, err := services.CreateResume(c.Request.Context(), q, userID, userAPIKey, rxClient, services.CreateResumeParams{
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
		userAPIKey := getUserRxAPIKey(c)

		resume, err := services.GetResume(c.Request.Context(), q, userID, userAPIKey, rxClient, id)
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
		userAPIKey := getUserRxAPIKey(c)

		err := services.DeleteResume(c.Request.Context(), q, userID, userAPIKey, rxClient, id)
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
		userAPIKey := getUserRxAPIKey(c)

		pdfBytes, err := services.ExportResumePDF(c.Request.Context(), q, userID, userAPIKey, rxClient, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		if errors.Is(err, services.ErrNotConfigured) {
			slog.Warn("pdf export attempted but not configured", "user_id", userID)
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "PDF export is not available — connect your Resume Builder API key or configure the resume printer"})
			return
		}
		if errors.Is(err, services.ErrNotLinked) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "This resume is not linked to the builder — open it in the builder first"})
			return
		}
		if err != nil {
			slog.Error("failed to export resume pdf", "user_id", userID, "resume_id", id, "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to export PDF"})
			return
		}

		c.Header("Content-Disposition", `attachment; filename="resume.pdf"`)
		c.Data(http.StatusOK, "application/pdf", pdfBytes)
	}
}

// SyncResumes handles POST /api/v1/resumes/sync
func SyncResumes(rxClient *rxresume.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		userAPIKey := getUserRxAPIKey(c)

		resp, err := services.SyncResumes(c.Request.Context(), q, userID, userAPIKey, rxClient)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sync resumes"})
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

// GetBaseResume handles GET /api/v1/resumes/base
func GetBaseResume() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		resume, err := services.GetBaseResume(c.Request.Context(), q, userID)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "no base resume set"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get base resume"})
			return
		}

		c.JSON(http.StatusOK, resume)
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

// ListResumeVersions handles GET /api/v1/resumes/:id/versions
func ListResumeVersions() gin.HandlerFunc {
	return func(c *gin.Context) {
		resumeID, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		versions, err := services.ListResumeVersionsByResume(c.Request.Context(), q, userID, resumeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list resume versions"})
			return
		}

		c.JSON(http.StatusOK, versions)
	}
}

// GetResumeVersion handles GET /api/v1/resume-versions/:id
func GetResumeVersion() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		version, err := services.GetResumeVersion(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume version not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get resume version"})
			return
		}

		c.JSON(http.StatusOK, version)
	}
}
