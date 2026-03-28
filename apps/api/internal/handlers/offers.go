package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// ListOffers handles GET /api/v1/offers
func ListOffers() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

		result, err := services.ListOffers(c.Request.Context(), q, userID, services.ListOffersParams{
			SortBy:       c.DefaultQuery("sort_by", "created_at"),
			SortOrder:    c.DefaultQuery("sort_order", "desc"),
			Page:         int32(page),
			PerPage:      int32(perPage),
			Search:       c.Query("search"),
			Status:       c.Query("status"),
			RemotePolicy: c.Query("remote_policy"),
		})
		if err != nil {
			slog.Error("failed to list offers", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list offers"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetOffer handles GET /api/v1/offers/:id
func GetOffer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		offer, err := services.GetOffer(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "offer not found"})
			return
		}
		if err != nil {
			slog.Error("failed to get offer", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get offer"})
			return
		}

		c.JSON(http.StatusOK, offer)
	}
}

type createOfferRequest struct {
	JobID          string          `json:"job_id" binding:"required"`
	BaseSalary     *int32          `json:"base_salary"`
	Currency       string          `json:"currency"`
	SalaryInterval string          `json:"salary_interval"`
	SignOnBonus    *int32          `json:"sign_on_bonus"`
	AnnualBonus    string          `json:"annual_bonus"`
	Equity         string          `json:"equity"`
	EquityValue    *int32          `json:"equity_value"`
	EquitySchedule string          `json:"equity_schedule"`
	Bonus          string          `json:"bonus"`
	Benefits       json.RawMessage `json:"benefits"`
	PtoDays        *int32          `json:"pto_days"`
	RemotePolicy   string          `json:"remote_policy"`
	RetirementMatch string         `json:"retirement_match"`
	Relocation     string          `json:"relocation"`
	WorkLocation   string          `json:"work_location"`
	Deadline       *string         `json:"deadline"`
	Accepted       *bool           `json:"accepted"`
	NegotiationLog json.RawMessage `json:"negotiation_log"`
}

var validSalaryIntervals = map[string]bool{"annual": true, "monthly": true, "hourly": true}
var validRemotePolicies = map[string]bool{"remote": true, "hybrid": true, "onsite": true}

func validateOfferFields(salaryInterval, remotePolicy string, baseSalary, signOnBonus, equityValue, ptoDays *int32) error {
	if salaryInterval != "" && !validSalaryIntervals[salaryInterval] {
		return errors.New("salary_interval must be annual, monthly, or hourly")
	}
	if remotePolicy != "" && !validRemotePolicies[remotePolicy] {
		return errors.New("remote_policy must be remote, hybrid, or onsite")
	}
	if baseSalary != nil && *baseSalary < 0 {
		return errors.New("base_salary must be non-negative")
	}
	if signOnBonus != nil && *signOnBonus < 0 {
		return errors.New("sign_on_bonus must be non-negative")
	}
	if equityValue != nil && *equityValue < 0 {
		return errors.New("equity_value must be non-negative")
	}
	if ptoDays != nil && *ptoDays < 0 {
		return errors.New("pto_days must be non-negative")
	}
	return nil
}

// CreateOffer handles POST /api/v1/offers
func CreateOffer() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createOfferRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := validateOfferFields(req.SalaryInterval, req.RemotePolicy, req.BaseSalary, req.SignOnBonus, req.EquityValue, req.PtoDays); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateOfferParams{
			JobID:           parseUUID(req.JobID),
			Currency:        pgtextValid(req.Currency),
			SalaryInterval:  pgtextValid(req.SalaryInterval),
			AnnualBonus:     pgtextValid(req.AnnualBonus),
			Equity:          pgtextValid(req.Equity),
			EquitySchedule:  pgtextValid(req.EquitySchedule),
			Bonus:           pgtextValid(req.Bonus),
			RemotePolicy:    pgtextValid(req.RemotePolicy),
			RetirementMatch: pgtextValid(req.RetirementMatch),
			Relocation:      pgtextValid(req.Relocation),
			WorkLocation:    pgtextValid(req.WorkLocation),
		}
		if req.BaseSalary != nil {
			params.BaseSalary = pgtype.Int4{Int32: *req.BaseSalary, Valid: true}
		}
		if req.SignOnBonus != nil {
			params.SignOnBonus = pgtype.Int4{Int32: *req.SignOnBonus, Valid: true}
		}
		if req.EquityValue != nil {
			params.EquityValue = pgtype.Int4{Int32: *req.EquityValue, Valid: true}
		}
		if req.PtoDays != nil {
			params.PtoDays = pgtype.Int4{Int32: *req.PtoDays, Valid: true}
		}
		if req.Benefits != nil {
			params.Benefits = req.Benefits
		}
		if req.Deadline != nil {
			if t, err := time.Parse(time.RFC3339, *req.Deadline); err == nil {
				params.Deadline = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
		if req.Accepted != nil {
			params.Accepted = pgtype.Bool{Bool: *req.Accepted, Valid: true}
		}
		if req.NegotiationLog != nil {
			params.NegotiationLog = req.NegotiationLog
		}

		offer, err := services.CreateOffer(c.Request.Context(), q, userID, params)
		if err != nil {
			slog.Error("failed to create offer", "error", err, "user_id", userID, "job_id", req.JobID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create offer"})
			return
		}

		c.JSON(http.StatusCreated, offer)
	}
}

type updateOfferRequest struct {
	BaseSalary      *int32          `json:"base_salary"`
	Currency        *string         `json:"currency"`
	SalaryInterval  *string         `json:"salary_interval"`
	SignOnBonus     *int32          `json:"sign_on_bonus"`
	AnnualBonus     *string         `json:"annual_bonus"`
	Equity          *string         `json:"equity"`
	EquityValue     *int32          `json:"equity_value"`
	EquitySchedule  *string         `json:"equity_schedule"`
	Bonus           *string         `json:"bonus"`
	Benefits        json.RawMessage `json:"benefits"`
	PtoDays         *int32          `json:"pto_days"`
	RemotePolicy    *string         `json:"remote_policy"`
	RetirementMatch *string         `json:"retirement_match"`
	Relocation      *string         `json:"relocation"`
	WorkLocation    *string         `json:"work_location"`
	Deadline        *string         `json:"deadline"`
	Accepted        *bool           `json:"accepted"`
	NegotiationLog  json.RawMessage `json:"negotiation_log"`
}

// UpdateOffer handles PUT /api/v1/offers/:id
func UpdateOffer() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateOfferRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Dereference optional strings for validation
		interval := ""
		if req.SalaryInterval != nil {
			interval = *req.SalaryInterval
		}
		policy := ""
		if req.RemotePolicy != nil {
			policy = *req.RemotePolicy
		}
		if err := validateOfferFields(interval, policy, req.BaseSalary, req.SignOnBonus, req.EquityValue, req.PtoDays); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		var params db.UpdateOfferParams
		if req.BaseSalary != nil {
			params.BaseSalary = pgtype.Int4{Int32: *req.BaseSalary, Valid: true}
		}
		if req.Currency != nil {
			params.Currency = pgtextValid(*req.Currency)
		}
		if req.SalaryInterval != nil {
			params.SalaryInterval = pgtextValid(*req.SalaryInterval)
		}
		if req.SignOnBonus != nil {
			params.SignOnBonus = pgtype.Int4{Int32: *req.SignOnBonus, Valid: true}
		}
		if req.AnnualBonus != nil {
			params.AnnualBonus = pgtextValid(*req.AnnualBonus)
		}
		if req.Equity != nil {
			params.Equity = pgtextValid(*req.Equity)
		}
		if req.EquityValue != nil {
			params.EquityValue = pgtype.Int4{Int32: *req.EquityValue, Valid: true}
		}
		if req.EquitySchedule != nil {
			params.EquitySchedule = pgtextValid(*req.EquitySchedule)
		}
		if req.Bonus != nil {
			params.Bonus = pgtextValid(*req.Bonus)
		}
		if req.Benefits != nil {
			params.Benefits = req.Benefits
		}
		if req.PtoDays != nil {
			params.PtoDays = pgtype.Int4{Int32: *req.PtoDays, Valid: true}
		}
		if req.RemotePolicy != nil {
			params.RemotePolicy = pgtextValid(*req.RemotePolicy)
		}
		if req.RetirementMatch != nil {
			params.RetirementMatch = pgtextValid(*req.RetirementMatch)
		}
		if req.Relocation != nil {
			params.Relocation = pgtextValid(*req.Relocation)
		}
		if req.WorkLocation != nil {
			params.WorkLocation = pgtextValid(*req.WorkLocation)
		}
		if req.Deadline != nil {
			if t, err := time.Parse(time.RFC3339, *req.Deadline); err == nil {
				params.Deadline = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}
		if req.Accepted != nil {
			params.Accepted = pgtype.Bool{Bool: *req.Accepted, Valid: true}
		}
		if req.NegotiationLog != nil {
			params.NegotiationLog = req.NegotiationLog
		}

		offer, err := services.UpdateOffer(c.Request.Context(), q, userID, id, params)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "offer not found"})
			return
		}
		if err != nil {
			slog.Error("failed to update offer", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update offer"})
			return
		}

		c.JSON(http.StatusOK, offer)
	}
}
