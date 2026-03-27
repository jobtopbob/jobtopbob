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

// CreateOffer creates a new offer.
func CreateOffer(ctx context.Context, q *db.Queries, userID string, params db.CreateOfferParams) (db.Offer, error) {
	params.UserID = userID
	return q.CreateOffer(ctx, params)
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
