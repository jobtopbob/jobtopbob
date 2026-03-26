package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListSearchProfiles handles GET /api/v1/search-profiles
func ListSearchProfiles() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "25"))

		result, err := services.ListSearchProfiles(c.Request.Context(), q, userID, services.ListSearchProfilesParams{
			Page:    int32(page),
			PerPage: int32(perPage),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list search profiles"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetSearchProfile handles GET /api/v1/search-profiles/:id
func GetSearchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		profile, err := services.GetSearchProfile(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "search profile not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get search profile"})
			return
		}

		c.JSON(http.StatusOK, profile)
	}
}

type createSearchProfileRequest struct {
	Name            string   `json:"name" binding:"required"`
	Keywords        []string `json:"keywords"`
	Location        string   `json:"location"`
	Country         string   `json:"country"`
	JobType         string   `json:"job_type"`
	ExperienceLevel string   `json:"experience_level"`
	RemoteOnly      bool     `json:"remote_only"`
	SalaryMin       *int32   `json:"salary_min"`
	SalaryMax       *int32   `json:"salary_max"`
	Skills          []string `json:"skills"`
	TargetRoles     []string `json:"target_roles"`
}

// CreateSearchProfile handles POST /api/v1/search-profiles
func CreateSearchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createSearchProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		profile, err := services.CreateSearchProfile(c.Request.Context(), q, userID, services.CreateSearchProfileParams{
			Name:            req.Name,
			Source:          "manual",
			Keywords:        req.Keywords,
			Location:        req.Location,
			Country:         req.Country,
			JobType:         req.JobType,
			ExperienceLevel: req.ExperienceLevel,
			RemoteOnly:      req.RemoteOnly,
			SalaryMin:       req.SalaryMin,
			SalaryMax:       req.SalaryMax,
			Skills:          req.Skills,
			TargetRoles:     req.TargetRoles,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create search profile"})
			return
		}

		c.JSON(http.StatusCreated, profile)
	}
}

type updateSearchProfileRequest struct {
	Name            *string  `json:"name"`
	Keywords        []string `json:"keywords"`
	Location        *string  `json:"location"`
	Country         *string  `json:"country"`
	JobType         *string  `json:"job_type"`
	ExperienceLevel *string  `json:"experience_level"`
	RemoteOnly      *bool    `json:"remote_only"`
	SalaryMin       *int32   `json:"salary_min"`
	SalaryMax       *int32   `json:"salary_max"`
	Skills          []string `json:"skills"`
	TargetRoles     []string `json:"target_roles"`
	IsActive        *bool    `json:"is_active"`
}

// UpdateSearchProfile handles PUT /api/v1/search-profiles/:id
func UpdateSearchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateSearchProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		profile, err := services.UpdateSearchProfile(c.Request.Context(), q, userID, id, services.UpdateSearchProfileParams{
			Name:            req.Name,
			Keywords:        req.Keywords,
			Location:        req.Location,
			Country:         req.Country,
			JobType:         req.JobType,
			ExperienceLevel: req.ExperienceLevel,
			RemoteOnly:      req.RemoteOnly,
			SalaryMin:       req.SalaryMin,
			SalaryMax:       req.SalaryMax,
			Skills:          req.Skills,
			TargetRoles:     req.TargetRoles,
			IsActive:        req.IsActive,
		})
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "search profile not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update search profile"})
			return
		}

		c.JSON(http.StatusOK, profile)
	}
}

// DeleteSearchProfile handles DELETE /api/v1/search-profiles/:id
func DeleteSearchProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		err := services.DeleteSearchProfile(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "search profile not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete search profile"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// RunSearchProfile handles POST /api/v1/search-profiles/:id/run
func RunSearchProfile(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		if asynqClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "scraping not available"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		profile, err := services.GetSearchProfile(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "search profile not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get search profile"})
			return
		}

		// Default sources if not specified
		sources := []string{"adzuna"}

		// Create scrape run record
		idStr := uuidToString(profile.ID)
		run, err := q.CreateScrapeRun(c.Request.Context(), db.CreateScrapeRunParams{
			UserID:            userID,
			SearchProfileID:   profile.ID,
			Status:            pgtype.Text{String: "pending", Valid: true},
			Sources:           sources,
			Keywords:          profile.Keywords,
			Location:          profile.Location,
			Country:           profile.Country,
			StartedAt:         pgtype.Timestamptz{},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create scrape run"})
			return
		}

		// Enqueue the scrape dispatch task
		payload, _ := json.Marshal(map[string]interface{}{
			"user_id":           userID,
			"scrape_run_id":     uuidToString(run.ID),
			"search_profile_id": idStr,
			"keywords":          profile.Keywords,
			"location":          profile.Location.String,
			"country":           profile.Country.String,
			"sources":           sources,
		})
		task := asynq.NewTask("scrape:dispatch", payload)
		if _, err := asynqClient.Enqueue(task); err != nil {
			slog.Error("failed to enqueue scrape dispatch", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue scrape"})
			return
		}

		// Update last_run_at
		_ = q.UpdateSearchProfileLastRun(c.Request.Context(), profile.ID)

		c.JSON(http.StatusAccepted, gin.H{
			"scrape_run_id": uuidToString(run.ID),
			"status":        "pending",
		})
	}
}

