package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListJobs handles GET /api/v1/jobs
func ListJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "25"))

		params := services.ListJobsParams{
			Statuses:      splitCSV(c.Query("statuses")),
			LocationTypes: splitCSV(c.Query("location_types")),
			Sources:       splitCSV(c.Query("sources")),
			Search:        pgtextValid(c.Query("search")),
			SortBy:        c.DefaultQuery("sort_by", "created_at"),
			SortOrder:     c.DefaultQuery("sort_order", "desc"),
			Page:          int32(page),
			PerPage:       int32(perPage),
		}

		if s := c.Query("stage_ids"); s != "" {
			params.StageIDs = parseUUIDs(s)
		}
		if s := c.Query("tag_ids"); s != "" {
			params.TagIDs = parseUUIDs(s)
		}
		if s := c.Query("created_after"); s != "" {
			if t, err := time.Parse(time.RFC3339, s); err == nil {
				params.CreatedAfter = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
		if s := c.Query("created_before"); s != "" {
			if t, err := time.Parse(time.RFC3339, s); err == nil {
				params.CreatedBefore = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}

		result, err := services.ListJobs(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list jobs"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

type createJobRequest struct {
	Title          string  `json:"title" binding:"required"`
	CompanyID      *string `json:"company_id"`
	StageID        *string `json:"stage_id"`
	Status         string  `json:"status"`
	Source         string  `json:"source"`
	SourceURL      string  `json:"source_url"`
	Location       string  `json:"location"`
	LocationType   string  `json:"location_type"`
	SalaryMin      *int32  `json:"salary_min"`
	SalaryMax      *int32  `json:"salary_max"`
	SalaryCurrency string  `json:"salary_currency"`
	Interest       *int32  `json:"interest"`
	JdRaw          string  `json:"jd_raw"`
	AppliedAt      *string `json:"applied_at"`
	FollowUpAt     *string `json:"follow_up_at"`
}

// CreateJob handles POST /api/v1/jobs
func CreateJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createJobRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateJobParams{
			Title:          req.Title,
			Status:         pgtextValid(req.Status),
			Source:         pgtextValid(req.Source),
			SourceUrl:      pgtextValid(req.SourceURL),
			Location:       pgtextValid(req.Location),
			LocationType:   pgtextValid(req.LocationType),
			SalaryCurrency: pgtextValid(req.SalaryCurrency),
			JdRaw:          pgtextValid(req.JdRaw),
		}
		if req.CompanyID != nil {
			params.CompanyID = parseUUID(*req.CompanyID)
		}
		if req.StageID != nil {
			params.StageID = parseUUID(*req.StageID)
		}
		if req.SalaryMin != nil {
			params.SalaryMin = pgtype.Int4{Int32: *req.SalaryMin, Valid: true}
		}
		if req.SalaryMax != nil {
			params.SalaryMax = pgtype.Int4{Int32: *req.SalaryMax, Valid: true}
		}
		if req.Interest != nil {
			params.Interest = pgtype.Int4{Int32: *req.Interest, Valid: true}
		}
		if req.AppliedAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.AppliedAt); err == nil {
				params.AppliedAt = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
		if req.FollowUpAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.FollowUpAt); err == nil {
				params.FollowUpAt = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}

		job, err := services.CreateJob(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create job"})
			return
		}

		c.JSON(http.StatusCreated, job)
	}
}

// GetJob handles GET /api/v1/jobs/:id
func GetJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		job, err := services.GetJob(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get job"})
			return
		}

		c.JSON(http.StatusOK, job)
	}
}

type updateJobRequest struct {
	Title             *string `json:"title"`
	CompanyID         *string `json:"company_id"`
	StageID           *string `json:"stage_id"`
	Status            *string `json:"status"`
	CloseReason       *string `json:"close_reason"`
	Source            *string `json:"source"`
	SourceURL         *string `json:"source_url"`
	Location          *string `json:"location"`
	LocationType      *string `json:"location_type"`
	SalaryMin         *int32  `json:"salary_min"`
	SalaryMax         *int32  `json:"salary_max"`
	SalaryMarket      *int32  `json:"salary_market"`
	SalaryCurrency    *string `json:"salary_currency"`
	Interest          *int32  `json:"interest"`
	Suitability       *int32  `json:"suitability"`
	SuitabilityReason *string `json:"suitability_reason"`
	ResumeVersionID   *string `json:"resume_version_id"`
	JdRaw             *string `json:"jd_raw"`
	AppliedAt         *string `json:"applied_at"`
	FollowUpAt        *string `json:"follow_up_at"`
}

// UpdateJob handles PUT /api/v1/jobs/:id
func UpdateJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateJobRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		var params db.UpdateJobParams
		if req.Title != nil {
			params.Title = pgtextValid(*req.Title)
		}
		if req.CompanyID != nil {
			params.CompanyID = parseUUID(*req.CompanyID)
		}
		if req.StageID != nil {
			params.StageID = parseUUID(*req.StageID)
		}
		if req.Status != nil {
			params.Status = pgtextValid(*req.Status)
		}
		if req.CloseReason != nil {
			params.CloseReason = pgtextValid(*req.CloseReason)
		}
		if req.Source != nil {
			params.Source = pgtextValid(*req.Source)
		}
		if req.SourceURL != nil {
			params.SourceUrl = pgtextValid(*req.SourceURL)
		}
		if req.Location != nil {
			params.Location = pgtextValid(*req.Location)
		}
		if req.LocationType != nil {
			params.LocationType = pgtextValid(*req.LocationType)
		}
		if req.SalaryMin != nil {
			params.SalaryMin = pgtype.Int4{Int32: *req.SalaryMin, Valid: true}
		}
		if req.SalaryMax != nil {
			params.SalaryMax = pgtype.Int4{Int32: *req.SalaryMax, Valid: true}
		}
		if req.SalaryMarket != nil {
			params.SalaryMarket = pgtype.Int4{Int32: *req.SalaryMarket, Valid: true}
		}
		if req.SalaryCurrency != nil {
			params.SalaryCurrency = pgtextValid(*req.SalaryCurrency)
		}
		if req.Interest != nil {
			params.Interest = pgtype.Int4{Int32: *req.Interest, Valid: true}
		}
		if req.Suitability != nil {
			params.Suitability = pgtype.Int4{Int32: *req.Suitability, Valid: true}
		}
		if req.SuitabilityReason != nil {
			params.SuitabilityReason = pgtextValid(*req.SuitabilityReason)
		}
		if req.ResumeVersionID != nil {
			params.ResumeVersionID = parseUUID(*req.ResumeVersionID)
		}
		if req.JdRaw != nil {
			params.JdRaw = pgtextValid(*req.JdRaw)
		}
		if req.AppliedAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.AppliedAt); err == nil {
				params.AppliedAt = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
		if req.FollowUpAt != nil {
			if t, err := time.Parse(time.RFC3339, *req.FollowUpAt); err == nil {
				params.FollowUpAt = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}

		job, err := services.UpdateJob(c.Request.Context(), q, userID, id, params)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update job"})
			return
		}

		c.JSON(http.StatusOK, job)
	}
}

// DeleteJob handles DELETE /api/v1/jobs/:id
func DeleteJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteJob(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete job"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

type importJobRequest struct {
	Title          string `json:"title" binding:"required"`
	SourceURL      string `json:"source_url" binding:"required"`
	Source         string `json:"source"`
	Location       string `json:"location"`
	LocationType   string `json:"location_type"`
	SalaryMin      *int32 `json:"salary_min"`
	SalaryMax      *int32 `json:"salary_max"`
	SalaryCurrency string `json:"salary_currency"`
	JdRaw          string `json:"jd_raw"`
	CompanyName    string `json:"company_name"`
}

// ImportJob handles POST /api/v1/jobs/import
func ImportJob() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req importJobRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateJobParams{
			Title:          req.Title,
			Source:         pgtextValid(req.Source),
			SourceUrl:      pgtextValid(req.SourceURL),
			Location:       pgtextValid(req.Location),
			LocationType:   pgtextValid(req.LocationType),
			SalaryCurrency: pgtextValid(req.SalaryCurrency),
			JdRaw:          pgtextValid(req.JdRaw),
		}
		if req.SalaryMin != nil {
			params.SalaryMin = pgtype.Int4{Int32: *req.SalaryMin, Valid: true}
		}
		if req.SalaryMax != nil {
			params.SalaryMax = pgtype.Int4{Int32: *req.SalaryMax, Valid: true}
		}

		job, err := services.ImportJob(c.Request.Context(), q, userID, params, req.CompanyName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to import job"})
			return
		}

		c.JSON(http.StatusCreated, job)
	}
}

type bulkUpdateRequest struct {
	JobIDs  []string `json:"job_ids" binding:"required"`
	StageID *string  `json:"stage_id"`
	Status  *string  `json:"status"`
	Delete  bool     `json:"delete"`
}

// BulkUpdate handles PATCH /api/v1/jobs/bulk
func BulkUpdate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req bulkUpdateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(req.JobIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "job_ids is required"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		jobIDs := make([]pgtype.UUID, len(req.JobIDs))
		for i, id := range req.JobIDs {
			jobIDs[i] = parseUUID(id)
		}

		var affected int64
		var err error

		if req.Delete {
			affected, err = services.BulkDelete(c.Request.Context(), q, userID, jobIDs)
		} else if req.StageID != nil {
			affected, err = services.BulkUpdateStage(c.Request.Context(), q, userID, jobIDs, parseUUID(*req.StageID))
		} else if req.Status != nil {
			affected, err = services.BulkUpdateStatus(c.Request.Context(), q, userID, jobIDs, *req.Status)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "must specify stage_id, status, or delete"})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to bulk update jobs"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"affected": affected})
	}
}
