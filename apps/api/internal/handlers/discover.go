package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

type quickSearchRequest struct {
	Keywords        []string `json:"keywords" binding:"required"`
	Location        string   `json:"location"`
	Country         string   `json:"country"`
	JobType         string   `json:"job_type"`
	ExperienceLevel string   `json:"experience_level"`
	RemoteOnly      bool     `json:"remote_only"`
	Sources         []string `json:"sources"`
}

// QuickSearch handles POST /api/v1/discover/search
// Creates a search profile and immediately triggers a scrape run.
func QuickSearch(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req quickSearchRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if asynqClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "scraping not available"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		// Generate a name from keywords
		name := strings.Join(req.Keywords, ", ")
		if len(name) > 100 {
			name = name[:100]
		}

		// Create the search profile
		profile, err := services.CreateSearchProfile(c.Request.Context(), q, userID, services.CreateSearchProfileParams{
			Name:            name,
			Source:          "manual",
			Keywords:        req.Keywords,
			Location:        req.Location,
			Country:         req.Country,
			JobType:         req.JobType,
			ExperienceLevel: req.ExperienceLevel,
			RemoteOnly:      req.RemoteOnly,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create search profile"})
			return
		}

		// Default sources
		sources := req.Sources
		if len(sources) == 0 {
			sources = []string{"serp"}
		}

		// Create scrape run
		run, err := q.CreateScrapeRun(c.Request.Context(), db.CreateScrapeRunParams{
			UserID:          userID,
			SearchProfileID: profile.ID,
			Status:          pgtype.Text{String: "pending", Valid: true},
			Sources:         sources,
			Keywords:        req.Keywords,
			Location:        profile.Location,
			Country:         profile.Country,
			StartedAt:       pgtype.Timestamptz{},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create scrape run"})
			return
		}

		// Enqueue scrape dispatch
		payload, _ := json.Marshal(map[string]interface{}{
			"user_id":           userID,
			"scrape_run_id":     uuidToString(run.ID),
			"search_profile_id": uuidToString(profile.ID),
			"keywords":          req.Keywords,
			"location":          req.Location,
			"country":           req.Country,
			"sources":           sources,
		})
		task := asynq.NewTask("scrape:dispatch", payload)
		if _, err := asynqClient.Enqueue(task); err != nil {
			slog.Error("failed to enqueue scrape dispatch", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue scrape"})
			return
		}

		_ = q.UpdateSearchProfileLastRun(c.Request.Context(), profile.ID)

		c.JSON(http.StatusAccepted, gin.H{
			"search_profile_id": uuidToString(profile.ID),
			"scrape_run_id":     uuidToString(run.ID),
			"status":            "pending",
		})
	}
}

// ListScrapeRuns handles GET /api/v1/scrape-runs
func ListScrapeRuns() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "25"))

		result, err := services.ListScrapeRuns(c.Request.Context(), q, userID, services.ListScrapeRunsParams{
			Page:    int32(page),
			PerPage: int32(perPage),
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list scrape runs"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetScrapeRun handles GET /api/v1/scrape-runs/:id
func GetScrapeRun() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		run, err := services.GetScrapeRun(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "scrape run not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get scrape run"})
			return
		}

		c.JSON(http.StatusOK, run)
	}
}

// ListDiscoveredJobs handles GET /api/v1/discover/jobs
func ListDiscoveredJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "25"))

		params := services.ListDiscoveredJobsParams{
			Search:  pgtextValid(c.Query("search")),
			Page:    int32(page),
			PerPage: int32(perPage),
		}

		if s := c.Query("scrape_run_id"); s != "" {
			params.ScrapeRunID = parseUUID(s)
		}

		result, err := services.ListDiscoveredJobs(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list discovered jobs"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// SearchFromExistingResume handles POST /api/v1/discover/from-resume/:id
// Creates a search profile from an existing RxResume and triggers AI analysis.
func SearchFromExistingResume(asynqClient *asynq.Client) gin.HandlerFunc {
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

		// Verify resume exists and belongs to user
		resume, err := q.GetResume(c.Request.Context(), db.GetResumeParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}

		// Create search profile from resume
		name := "From resume"
		if resume.Name != "" {
			name = fmt.Sprintf("From: %s", resume.Name)
		}

		profile, err := services.CreateSearchProfile(c.Request.Context(), q, userID, services.CreateSearchProfileParams{
			Name:     name,
			Source:   "resume",
			ResumeID: id,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create search profile"})
			return
		}

		// Enqueue resume analysis task
		payload, _ := json.Marshal(map[string]string{
			"user_id":           userID,
			"search_profile_id": uuidToString(profile.ID),
			"resume_id":         uuidToString(id),
		})
		task := asynq.NewTask("resume:analyze", payload)
		if _, err := asynqClient.Enqueue(task); err != nil {
			slog.Error("failed to enqueue resume analysis", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue analysis"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{
			"search_profile_id": uuidToString(profile.ID),
			"status":            "analyzing",
		})
	}
}
