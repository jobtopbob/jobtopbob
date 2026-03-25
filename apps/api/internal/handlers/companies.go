package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

// ListCompanies handles GET /api/v1/companies
func ListCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

		params := services.ListCompaniesParams{
			Industries:         splitCSV(c.Query("industries")),
			Sizes:              splitCSV(c.Query("sizes")),
			DataSources:        splitCSV(c.Query("data_sources")),
			EnrichmentStatuses: splitCSV(c.Query("enrichment_statuses")),
			Search:             pgtextValid(c.Query("search")),
			SortBy:             c.DefaultQuery("sort_by", "name"),
			SortOrder:          c.DefaultQuery("sort_order", "asc"),
			Page:               int32(page),
			PerPage:            int32(perPage),
		}

		result, err := services.ListCompanies(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list companies"})
			return
		}

		c.JSON(http.StatusOK, result)
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

const maxLogoSize = 5 << 20 // 5 MB

var allowedLogoTypes = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/gif":     ".gif",
	"image/svg+xml": ".svg",
}

// companyLogoKey returns the storage key for a company's logo.
func companyLogoKey(companyID, ext string) string {
	return fmt.Sprintf("logos/companies/%s%s", companyID, ext)
}

// UploadCompanyLogo handles POST /api/v1/companies/:id/logo
func UploadCompanyLogo(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		if store == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "storage not configured"})
			return
		}

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
			return
		}
		defer file.Close()

		if header.Size > maxLogoSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file too large, maximum 5 MB"})
			return
		}

		contentType := header.Header.Get("Content-Type")
		ext, valid := allowedLogoTypes[contentType]
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type, use JPEG, PNG, WebP, GIF, or SVG"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		// Verify company belongs to user
		company, err := q.GetCompany(c.Request.Context(), db.GetCompanyParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}

		// Delete old logo if it exists with a different extension
		idStr := fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16])
		for _, e := range allowedLogoTypes {
			if e != ext {
				_ = store.Delete(c.Request.Context(), companyLogoKey(idStr, e))
			}
		}

		key := companyLogoKey(idStr, ext)
		url, err := store.Upload(c.Request.Context(), key, file, contentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload logo"})
			return
		}

		// Update company logo_url
		_, err = q.UpdateCompany(c.Request.Context(), db.UpdateCompanyParams{
			ID:     company.ID,
			UserID: userID,
			LogoUrl: pgtype.Text{String: url, Valid: true},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save logo URL"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": url})
	}
}

// DeleteCompanyLogo handles DELETE /api/v1/companies/:id/logo
func DeleteCompanyLogo(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		company, err := q.GetCompany(c.Request.Context(), db.GetCompanyParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "company not found"})
			return
		}

		// Delete from storage
		if company.LogoUrl.Valid && store != nil {
			idStr := fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16])
			for _, ext := range allowedLogoTypes {
				_ = store.Delete(c.Request.Context(), companyLogoKey(idStr, ext))
			}
		}

		// Clear logo_url — pass empty string to set NULL
		emptyStr := ""
		_, err = services.UpdateCompany(c.Request.Context(), q, userID, id, services.UpdateCompanyParams{
			LogoURL: &emptyStr,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove logo"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": ""})
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
