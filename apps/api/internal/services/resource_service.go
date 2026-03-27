package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// GetResource returns a single resource.
func GetResource(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.Resource, error) {
	row, err := q.GetResource(ctx, db.GetResourceParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListResourcesParams holds filter/pagination parameters for listing resources.
type ListResourcesParams struct {
	Types      []string
	Categories []string
	Search     pgtype.Text
	SortBy     string
	SortOrder  string
	Page       int32
	PerPage    int32
}

// ListResourcesResult holds the paginated result.
type ListResourcesResult struct {
	Data    []db.Resource `json:"data"`
	Total   int64         `json:"total"`
	Page    int32         `json:"page"`
	PerPage int32         `json:"per_page"`
}

// ListResources returns a paginated, filtered list of resources.
func ListResources(ctx context.Context, q *db.Queries, userID string, p ListResourcesParams) (ListResourcesResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 12
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

	total, err := q.CountResources(ctx, db.CountResourcesParams{
		UserID:     userID,
		Types:      p.Types,
		Categories: p.Categories,
		Search:     p.Search,
	})
	if err != nil {
		return ListResourcesResult{}, err
	}

	resources, err := q.ListResources(ctx, db.ListResourcesParams{
		UserID:     userID,
		Limit:      p.PerPage,
		Offset:     offset,
		Types:      p.Types,
		Categories: p.Categories,
		Search:     p.Search,
		SortBy:     p.SortBy,
		SortOrder:  p.SortOrder,
	})
	if err != nil {
		return ListResourcesResult{}, err
	}

	return ListResourcesResult{
		Data:    resources,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// CreateResource creates a new resource.
func CreateResource(ctx context.Context, q *db.Queries, userID string, params db.CreateResourceParams) (db.Resource, error) {
	params.UserID = userID
	return q.CreateResource(ctx, params)
}

// UpdateResource updates a resource's fields.
func UpdateResource(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params db.UpdateResourceParams) (db.Resource, error) {
	params.ID = id
	params.UserID = userID
	row, err := q.UpdateResource(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// DeleteResource deletes a resource by ID.
func DeleteResource(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteResource(ctx, db.DeleteResourceParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// ToggleResourcePin toggles the pinned status of a resource.
func ToggleResourcePin(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.Resource, error) {
	row, err := q.ToggleResourcePin(ctx, db.ToggleResourcePinParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}
