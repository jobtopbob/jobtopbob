package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func pgtextOptional(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

// GetOffer returns a single offer with job title and company name joined.
func GetOffer(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetOfferRow, error) {
	row, err := q.GetOffer(ctx, db.GetOfferParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListOffersParams holds pagination and filter parameters for listing offers.
type ListOffersParams struct {
	SortBy       string
	SortOrder    string
	Page         int32
	PerPage      int32
	Search       string
	Status       string // "accepted", "declined", "pending"
	RemotePolicy string // "remote", "hybrid", "onsite"
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

	filterParams := db.CountOffersParams{
		UserID:       userID,
		Search:       pgtextOptional(p.Search),
		Status:       pgtextOptional(p.Status),
		RemotePolicy: pgtextOptional(p.RemotePolicy),
	}

	total, err := q.CountOffers(ctx, filterParams)
	if err != nil {
		return ListOffersResult{}, err
	}

	offers, err := q.ListOffers(ctx, db.ListOffersParams{
		UserID:       userID,
		Limit:        p.PerPage,
		Offset:       offset,
		Search:       filterParams.Search,
		Status:       filterParams.Status,
		RemotePolicy: filterParams.RemotePolicy,
		SortBy:       p.SortBy,
		SortOrder:    p.SortOrder,
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

	// Check if an offer already exists for this job (unique constraint on job_id).
	// We check first because a failed INSERT aborts the PostgreSQL transaction,
	// making subsequent queries in the same tx fail.
	existing, getErr := q.GetOfferByJobID(ctx, db.GetOfferByJobIDParams{JobID: params.JobID, UserID: userID})
	if getErr == nil {
		// Offer exists — update it instead.
		updated, updateErr := q.UpdateOffer(ctx, db.UpdateOfferParams{
			ID:              existing.ID,
			UserID:          userID,
			BaseSalary:      params.BaseSalary,
			Currency:        params.Currency,
			SalaryInterval:  params.SalaryInterval,
			SignOnBonus:     params.SignOnBonus,
			AnnualBonus:     params.AnnualBonus,
			Equity:          params.Equity,
			EquityValue:     params.EquityValue,
			EquitySchedule:  params.EquitySchedule,
			Bonus:           params.Bonus,
			Benefits:        params.Benefits,
			PtoDays:         params.PtoDays,
			RemotePolicy:    params.RemotePolicy,
			RetirementMatch: params.RetirementMatch,
			Relocation:      params.Relocation,
			WorkLocation:    params.WorkLocation,
			Deadline:        params.Deadline,
			Accepted:        params.Accepted,
			NegotiationLog:  params.NegotiationLog,
		})
		if updateErr != nil {
			return db.Offer{}, updateErr
		}
		return updated, nil
	}

	offer, err := q.CreateOffer(ctx, params)
	if err != nil {
		return db.Offer{}, err
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

// DeleteOffer deletes an offer by ID.
func DeleteOffer(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteOffer(ctx, db.DeleteOfferParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
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
