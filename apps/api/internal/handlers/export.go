package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ExportJobs handles GET /api/v1/export/jobs?format=json|csv
func ExportJobs() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		format := c.DefaultQuery("format", "json")

		result, err := services.ListJobs(c.Request.Context(), q, userID, services.ListJobsParams{
			Page:    1,
			PerPage: 500,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export jobs"})
			return
		}

		if format == "csv" {
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=\"jobs.csv\"")
			w := csv.NewWriter(c.Writer)
			_ = w.Write([]string{"id", "title", "company", "status", "stage", "location", "location_type", "source", "salary_min", "salary_max", "salary_offered", "salary_currency", "applied_at", "created_at"})
			for _, j := range result.Jobs {
				_ = w.Write([]string{
					uuidStr(j.ID),
					j.Title,
					pgStr(j.CompanyName),
					pgStr(j.Status),
					pgStr(j.StageName),
					pgStr(j.Location),
					pgStr(j.LocationType),
					pgStr(j.Source),
					pgIntStr(j.SalaryMin),
					pgIntStr(j.SalaryMax),
					pgIntStr(j.SalaryOffered),
					pgStr(j.SalaryCurrency),
					pgTimeStr(j.AppliedAt),
					j.CreatedAt.Time.Format("2006-01-02"),
				})
			}
			w.Flush()
			return
		}

		c.Header("Content-Type", "application/json")
		c.Header("Content-Disposition", "attachment; filename=\"jobs.json\"")
		_ = json.NewEncoder(c.Writer).Encode(result.Jobs)
	}
}

// ExportCompanies handles GET /api/v1/export/companies?format=json|csv
func ExportCompanies() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		format := c.DefaultQuery("format", "json")

		result, err := services.ListCompanies(c.Request.Context(), q, userID, services.ListCompaniesParams{
			Page:    1,
			PerPage: 500,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export companies"})
			return
		}

		if format == "csv" {
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=\"companies.csv\"")
			w := csv.NewWriter(c.Writer)
			_ = w.Write([]string{"id", "name", "domain", "website", "industry", "size", "location", "employee_count", "created_at"})
			for _, co := range result.Data {
				_ = w.Write([]string{
					uuidStr(co.ID),
					co.Name,
					pgStr(co.Domain),
					pgStr(co.Website),
					pgStr(co.Industry),
					pgStr(co.Size),
					pgStr(co.Location),
					pgIntStr(co.EmployeeCount),
					co.CreatedAt.Time.Format("2006-01-02"),
				})
			}
			w.Flush()
			return
		}

		c.Header("Content-Type", "application/json")
		c.Header("Content-Disposition", "attachment; filename=\"companies.json\"")
		_ = json.NewEncoder(c.Writer).Encode(result.Data)
	}
}

// ExportContacts handles GET /api/v1/export/contacts?format=json|csv
func ExportContacts() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		format := c.DefaultQuery("format", "json")

		result, err := services.ListContacts(c.Request.Context(), q, userID, services.ListContactsParams{
			Page:    1,
			PerPage: 500,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export contacts"})
			return
		}

		if format == "csv" {
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=\"contacts.csv\"")
			w := csv.NewWriter(c.Writer)
			_ = w.Write([]string{"id", "name", "role", "email", "company", "status", "source", "linkedin_url", "last_contact", "created_at"})
			for _, ct := range result.Data {
				_ = w.Write([]string{
					uuidStr(ct.ID),
					ct.Name,
					pgStr(ct.Role),
					pgStr(ct.Email),
					pgStr(ct.CompanyName),
					pgStr(ct.Status),
					pgStr(ct.Source),
					pgStr(ct.LinkedinUrl),
					pgTimeStr(ct.LastContact),
					ct.CreatedAt.Time.Format("2006-01-02"),
				})
			}
			w.Flush()
			return
		}

		c.Header("Content-Type", "application/json")
		c.Header("Content-Disposition", "attachment; filename=\"contacts.json\"")
		_ = json.NewEncoder(c.Writer).Encode(result.Data)
	}
}

// ExportOffers handles GET /api/v1/export/offers?format=json|csv
func ExportOffers() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)
		format := c.DefaultQuery("format", "json")

		result, err := services.ListOffers(c.Request.Context(), q, userID, services.ListOffersParams{
			Page:    1,
			PerPage: 500,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export offers"})
			return
		}

		if format == "csv" {
			c.Header("Content-Type", "text/csv")
			c.Header("Content-Disposition", "attachment; filename=\"offers.csv\"")
			w := csv.NewWriter(c.Writer)
			_ = w.Write([]string{
				"id", "job_title", "company", "base_salary", "currency", "salary_interval",
				"sign_on_bonus", "annual_bonus", "equity", "equity_value", "equity_schedule",
				"bonus", "pto_days", "remote_policy", "retirement_match", "relocation",
				"work_location", "deadline", "accepted", "created_at",
			})
			for _, o := range result.Data {
				accepted := ""
				if o.Accepted.Valid {
					if o.Accepted.Bool {
						accepted = "yes"
					} else {
						accepted = "no"
					}
				}
				_ = w.Write([]string{
					uuidStr(o.ID),
					pgStr(o.JobTitle),
					pgStr(o.CompanyName),
					pgIntStr(o.BaseSalary),
					pgStr(o.Currency),
					pgStr(o.SalaryInterval),
					pgIntStr(o.SignOnBonus),
					pgStr(o.AnnualBonus),
					pgStr(o.Equity),
					pgIntStr(o.EquityValue),
					pgStr(o.EquitySchedule),
					pgStr(o.Bonus),
					pgIntStr(o.PtoDays),
					pgStr(o.RemotePolicy),
					pgStr(o.RetirementMatch),
					pgStr(o.Relocation),
					pgStr(o.WorkLocation),
					pgTimeStr(o.Deadline),
					accepted,
					o.CreatedAt.Time.Format("2006-01-02"),
				})
			}
			w.Flush()
			return
		}

		c.Header("Content-Type", "application/json")
		c.Header("Content-Disposition", "attachment; filename=\"offers.json\"")
		_ = json.NewEncoder(c.Writer).Encode(result.Data)
	}
}

// --- CSV helper functions ---

func uuidStr(u pgtype.UUID) string {
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func pgStr(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func pgIntStr(t pgtype.Int4) string {
	if !t.Valid {
		return ""
	}
	return fmt.Sprintf("%d", t.Int32)
}

func pgTimeStr(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format("2006-01-02")
}
