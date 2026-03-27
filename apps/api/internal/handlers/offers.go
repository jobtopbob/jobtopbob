package handlers

import (
	"encoding/json"
	"errors"
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
			SortBy:    c.DefaultQuery("sort_by", "created_at"),
			SortOrder: c.DefaultQuery("sort_order", "desc"),
			Page:      int32(page),
			PerPage:   int32(perPage),
		})
		if err != nil {
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get offer"})
			return
		}

		c.JSON(http.StatusOK, offer)
	}
}

type createOfferRequest struct {
	JobID    string           `json:"job_id" binding:"required"`
	BaseSalary *int32         `json:"base_salary"`
	Currency   string         `json:"currency"`
	Equity     string         `json:"equity"`
	Bonus      string         `json:"bonus"`
	Benefits   json.RawMessage `json:"benefits"`
	Deadline   *string        `json:"deadline"`
	Accepted   *bool          `json:"accepted"`
	NegotiationLog json.RawMessage `json:"negotiation_log"`
}

// CreateOffer handles POST /api/v1/offers
func CreateOffer() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createOfferRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateOfferParams{
			JobID:    parseUUID(req.JobID),
			Currency: pgtextValid(req.Currency),
			Equity:   pgtextValid(req.Equity),
			Bonus:    pgtextValid(req.Bonus),
		}
		if req.BaseSalary != nil {
			params.BaseSalary = pgtype.Int4{Int32: *req.BaseSalary, Valid: true}
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create offer"})
			return
		}

		c.JSON(http.StatusCreated, offer)
	}
}

type updateOfferRequest struct {
	BaseSalary     *int32          `json:"base_salary"`
	Currency       *string         `json:"currency"`
	Equity         *string         `json:"equity"`
	Bonus          *string         `json:"bonus"`
	Benefits       json.RawMessage `json:"benefits"`
	Deadline       *string         `json:"deadline"`
	Accepted       *bool           `json:"accepted"`
	NegotiationLog json.RawMessage `json:"negotiation_log"`
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

		q := db.New(getTx(c))
		userID := getUserID(c)

		var params db.UpdateOfferParams
		if req.BaseSalary != nil {
			params.BaseSalary = pgtype.Int4{Int32: *req.BaseSalary, Valid: true}
		}
		if req.Currency != nil {
			params.Currency = pgtextValid(*req.Currency)
		}
		if req.Equity != nil {
			params.Equity = pgtextValid(*req.Equity)
		}
		if req.Bonus != nil {
			params.Bonus = pgtextValid(*req.Bonus)
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

		offer, err := services.UpdateOffer(c.Request.Context(), q, userID, id, params)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "offer not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update offer"})
			return
		}

		c.JSON(http.StatusOK, offer)
	}
}
