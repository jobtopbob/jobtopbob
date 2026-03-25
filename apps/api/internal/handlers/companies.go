package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListCompanies handles GET /api/v1/companies
func ListCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		companies, err := services.ListCompanies(c.Request.Context(), q, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list companies"})
			return
		}

		c.JSON(http.StatusOK, companies)
	}
}

// GetCompany handles GET /api/v1/companies/:id
func GetCompany() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		company, err := services.GetCompany(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get company"})
			return
		}

		c.JSON(http.StatusOK, company)
	}
}

type createCompanyRequest struct {
	Name          string `json:"name" binding:"required"`
	Website       string `json:"website"`
	Description   string `json:"description"`
	Industry      string `json:"industry"`
	Size          string `json:"size"`
	Location      string `json:"location"`
	FoundedYear   *int32 `json:"founded_year"`
	LinkedinURL   string `json:"linkedin_url"`
	EmployeeCount *int32 `json:"employee_count"`
	Interest      *int32 `json:"interest"`
	Notes         string `json:"notes"`
	LogoURL       string `json:"logo_url"`
}

// CreateCompany handles POST /api/v1/companies
func CreateCompany() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createCompanyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		company, err := services.CreateCompany(c.Request.Context(), q, userID, services.CreateCompanyParams{
			Name:          req.Name,
			Website:       req.Website,
			Description:   req.Description,
			Industry:      req.Industry,
			Size:          req.Size,
			Location:      req.Location,
			FoundedYear:   req.FoundedYear,
			LinkedinURL:   req.LinkedinURL,
			EmployeeCount: req.EmployeeCount,
			Interest:      req.Interest,
			Notes:         req.Notes,
			LogoURL:       req.LogoURL,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create company"})
			return
		}

		c.JSON(http.StatusCreated, company)
	}
}

type updateCompanyRequest struct {
	Name          *string `json:"name"`
	Website       *string `json:"website"`
	Description   *string `json:"description"`
	Industry      *string `json:"industry"`
	Size          *string `json:"size"`
	Location      *string `json:"location"`
	FoundedYear   *int32  `json:"founded_year"`
	LinkedinURL   *string `json:"linkedin_url"`
	EmployeeCount *int32  `json:"employee_count"`
	Interest      *int32  `json:"interest"`
	Notes         *string `json:"notes"`
	LogoURL       *string `json:"logo_url"`
}

// UpdateCompany handles PUT /api/v1/companies/:id
func UpdateCompany() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateCompanyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		company, err := services.UpdateCompany(c.Request.Context(), q, userID, id, services.UpdateCompanyParams{
			Name:          req.Name,
			Website:       req.Website,
			Description:   req.Description,
			Industry:      req.Industry,
			Size:          req.Size,
			Location:      req.Location,
			FoundedYear:   req.FoundedYear,
			LinkedinURL:   req.LinkedinURL,
			EmployeeCount: req.EmployeeCount,
			Interest:      req.Interest,
			Notes:         req.Notes,
			LogoURL:       req.LogoURL,
		})
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update company"})
			return
		}

		c.JSON(http.StatusOK, company)
	}
}

// DeleteCompany handles DELETE /api/v1/companies/:id
func DeleteCompany() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteCompany(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete company"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// SearchCompanies handles GET /api/v1/companies/search?q=
func SearchCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		companies, err := services.SearchCompanies(c.Request.Context(), q, userID, query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search companies"})
			return
		}

		c.JSON(http.StatusOK, companies)
	}
}

// EnrichCompany handles POST /api/v1/companies/:id/enrich
func EnrichCompany(asynqClient *asynq.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		if asynqClient == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enrichment not available"})
			return
		}

		// Verify the company exists and belongs to the user
		q := db.New(getTx(c))
		userID := getUserID(c)

		_, err := q.GetCompany(c.Request.Context(), db.GetCompanyParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}

		// Enqueue the enrichment task
		payload, _ := json.Marshal(map[string]string{
			"user_id":    userID,
			"company_id": fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16]),
		})
		task := asynq.NewTask("company:enrich", payload)
		if _, err := asynqClient.Enqueue(task); err != nil {
			slog.Error("failed to enqueue company enrichment", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to enqueue enrichment"})
			return
		}

		c.JSON(http.StatusAccepted, gin.H{"status": "enrichment queued"})
	}
}

// ListEnrichmentLogs handles GET /api/v1/companies/:id/enrichment-logs
func ListEnrichmentLogs() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		logs, err := q.ListEnrichmentLogs(c.Request.Context(), db.ListEnrichmentLogsParams{
			CompanyID: id,
			UserID:    userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list enrichment logs"})
			return
		}

		c.JSON(http.StatusOK, logs)
	}
}
