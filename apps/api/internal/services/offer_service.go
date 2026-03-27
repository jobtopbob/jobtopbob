package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// GetOffer returns a single offer with job title and company name joined.
func GetOffer(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetOfferRow, error) {
	row, err := q.GetOffer(ctx, db.GetOfferParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListOffersParams holds pagination parameters for listing offers.
type ListOffersParams struct {
	SortBy    string
	SortOrder string
	Page      int32
	PerPage   int32
}

// ListOffersResult holds the paginated result.
type ListOffersResult struct {
	Data    []db.ListOffersRow `json:"data"`
	Total   int64              `json:"total"`
	Page    int32              `json:"page"`
	PerPage int32              `json:"per_page"`
}

// ListOffers returns a paginated list of offers with job and company info.
func ListOffers(ctx context.Context, q *db.Queries, userID string, p ListOffersParams) (ListOffersResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 10
	} else if p.PerPage > 500 {
		p.PerPage = 500
	}
	if p.SortBy == "" {
		p.SortBy = "created_at"
	}
	if p.SortOrder == "" {
		p.SortOrder = "desc"
	}

	offset := (p.Page - 1) * p.PerPage

	total, err := q.CountOffers(ctx, userID)
	if err != nil {
		return ListOffersResult{}, err
	}

	offers, err := q.ListOffers(ctx, db.ListOffersParams{
		UserID:    userID,
		Limit:     p.PerPage,
		Offset:    offset,
		SortBy:    p.SortBy,
		SortOrder: p.SortOrder,
	})
	if err != nil {
		return ListOffersResult{}, err
	}

	return ListOffersResult{
		Data:    offers,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// CreateOffer creates a new offer and moves the job to the offer stage if it isn't already there.
// If the job already has an offer (e.g. an auto-created stub), the existing offer is updated instead.
func CreateOffer(ctx context.Context, q *db.Queries, userID string, params db.CreateOfferParams) (db.Offer, error) {
	params.UserID = userID
	offer, err := q.CreateOffer(ctx, params)
	if err != nil {
		// If an offer already exists for this job (unique constraint), update it instead.
		existing, getErr := q.GetOfferByJobID(ctx, db.GetOfferByJobIDParams{JobID: params.JobID, UserID: userID})
		if getErr != nil {
			return db.Offer{}, err // return original create error
		}
		updated, updateErr := q.UpdateOffer(ctx, db.UpdateOfferParams{
			ID:             existing.ID,
			UserID:         userID,
			BaseSalary:     params.BaseSalary,
			Currency:       params.Currency,
			Equity:         params.Equity,
			Bonus:          params.Bonus,
			Benefits:       params.Benefits,
			Deadline:       params.Deadline,
			Accepted:       params.Accepted,
			NegotiationLog: params.NegotiationLog,
		})
		if updateErr != nil {
			return db.Offer{}, updateErr
		}
		return updated, nil
	}

	// Auto-move the job to the offer stage so Kanban stays in sync.
	offerStage, err := q.GetStageByMappedStatus(ctx, db.GetStageByMappedStatusParams{
		UserID:       userID,
		MappedStatus: pgtype.Text{String: "offer", Valid: true},
	})
	if err == nil {
		// Best-effort: if the job isn't already at the offer stage, move it.
		_, _ = q.UpdateJob(ctx, db.UpdateJobParams{
			ID:      params.JobID,
			UserID:  userID,
			StageID: offerStage.ID,
		})
	}

	return offer, nil
}

// EnsureOfferExists creates a skeleton offer for a job if one doesn't already exist.
// Best-effort — errors are silently ignored (same pattern as CreateOffer's auto-stage-move).
func EnsureOfferExists(ctx context.Context, q *db.Queries, userID string, jobID pgtype.UUID) {
	_, err := q.GetOfferByJobID(ctx, db.GetOfferByJobIDParams{JobID: jobID, UserID: userID})
	if err == nil {
		return // offer already exists
	}
	_, _ = q.CreateOffer(ctx, db.CreateOfferParams{UserID: userID, JobID: jobID})
}

// UpdateOffer updates an offer's fields.
func UpdateOffer(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params db.UpdateOfferParams) (db.Offer, error) {
	params.ID = id
	params.UserID = userID
	row, err := q.UpdateOffer(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}
