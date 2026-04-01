package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ListSearchProfilesParams holds pagination parameters.
type ListSearchProfilesParams struct {
	Page    int32
	PerPage int32
}

// SearchProfileWithMeta wraps a search profile with computed metadata.
type SearchProfileWithMeta struct {
	db.ListSearchProfilesRow
}

// ListSearchProfilesResult holds the paginated result.
type ListSearchProfilesResult struct {
	Data    []db.ListSearchProfilesRow `json:"data"`
	Total   int64                      `json:"total"`
	Page    int32                      `json:"page"`
	PerPage int32                      `json:"per_page"`
}

// ListSearchProfiles returns a paginated list of search profiles.
func ListSearchProfiles(ctx context.Context, q *db.Queries, userID string, p ListSearchProfilesParams) (ListSearchProfilesResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 25
	} else if p.PerPage > 100 {
		p.PerPage = 100
	}

	offset := (p.Page - 1) * p.PerPage

	total, err := q.CountSearchProfiles(ctx, userID)
	if err != nil {
		return ListSearchProfilesResult{}, err
	}

	profiles, err := q.ListSearchProfiles(ctx, db.ListSearchProfilesParams{
		UserID: userID,
		Limit:  p.PerPage,
		Offset: offset,
	})
	if err != nil {
		return ListSearchProfilesResult{}, err
	}

	return ListSearchProfilesResult{
		Data:    profiles,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// GetSearchProfile returns a single search profile.
func GetSearchProfile(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.SearchProfile, error) {
	row, err := q.GetSearchProfile(ctx, db.GetSearchProfileParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// CreateSearchProfileParams holds the parameters for creating a search profile.
type CreateSearchProfileParams struct {
	Name            string
	Source          string
	ResumeID        pgtype.UUID
	Keywords        []string
	Location        string
	Country         string
	Language        string
	JobType         string
	ExperienceLevel string
	RemoteOnly      bool
	SalaryMin       *int32
	SalaryMax       *int32
	Skills          []string
	TargetRoles     []string
}

// CreateSearchProfile creates a new search profile.
func CreateSearchProfile(ctx context.Context, q *db.Queries, userID string, p CreateSearchProfileParams) (db.SearchProfile, error) {
	source := p.Source
	if source == "" {
		source = "manual"
	}
	country := p.Country
	if country == "" {
		country = "US"
	}

	var salaryMin, salaryMax pgtype.Int4
	if p.SalaryMin != nil {
		salaryMin = pgtype.Int4{Int32: *p.SalaryMin, Valid: true}
	}
	if p.SalaryMax != nil {
		salaryMax = pgtype.Int4{Int32: *p.SalaryMax, Valid: true}
	}

	return q.CreateSearchProfile(ctx, db.CreateSearchProfileParams{
		UserID:          userID,
		Name:            p.Name,
		Source:          source,
		ResumeID:        p.ResumeID,
		Keywords:        p.Keywords,
		Location:        pgtype.Text{String: p.Location, Valid: p.Location != ""},
		Country:         pgtype.Text{String: country, Valid: true},
		Language:        pgtype.Text{String: p.Language, Valid: p.Language != ""},
		JobType:         pgtype.Text{String: p.JobType, Valid: p.JobType != ""},
		ExperienceLevel: pgtype.Text{String: p.ExperienceLevel, Valid: p.ExperienceLevel != ""},
		RemoteOnly:      pgtype.Bool{Bool: p.RemoteOnly, Valid: true},
		SalaryMin:       salaryMin,
		SalaryMax:       salaryMax,
		Skills:          p.Skills,
		TargetRoles:     p.TargetRoles,
	})
}

// UpdateSearchProfileParams holds the update parameters.
type UpdateSearchProfileParams struct {
	Name            *string
	Keywords        []string
	Location        *string
	Country         *string
	JobType         *string
	ExperienceLevel *string
	RemoteOnly      *bool
	SalaryMin       *int32
	SalaryMax       *int32
	Skills          []string
	TargetRoles     []string
	IsActive        *bool
}

// UpdateSearchProfile updates an existing search profile.
func UpdateSearchProfile(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, p UpdateSearchProfileParams) (db.SearchProfile, error) {
	params := db.UpdateSearchProfileParams{
		ID:     id,
		UserID: userID,
	}

	if p.Name != nil {
		params.Name = pgtype.Text{String: *p.Name, Valid: true}
	}
	if p.Keywords != nil {
		params.Keywords = p.Keywords
	}
	if p.Location != nil {
		params.Location = pgtype.Text{String: *p.Location, Valid: true}
	}
	if p.Country != nil {
		params.Country = pgtype.Text{String: *p.Country, Valid: true}
	}
	if p.JobType != nil {
		params.JobType = pgtype.Text{String: *p.JobType, Valid: true}
	}
	if p.ExperienceLevel != nil {
		params.ExperienceLevel = pgtype.Text{String: *p.ExperienceLevel, Valid: true}
	}
	if p.RemoteOnly != nil {
		params.RemoteOnly = pgtype.Bool{Bool: *p.RemoteOnly, Valid: true}
	}
	if p.SalaryMin != nil {
		params.SalaryMin = pgtype.Int4{Int32: *p.SalaryMin, Valid: true}
	}
	if p.SalaryMax != nil {
		params.SalaryMax = pgtype.Int4{Int32: *p.SalaryMax, Valid: true}
	}
	if p.Skills != nil {
		params.Skills = p.Skills
	}
	if p.TargetRoles != nil {
		params.TargetRoles = p.TargetRoles
	}
	if p.IsActive != nil {
		params.IsActive = pgtype.Bool{Bool: *p.IsActive, Valid: true}
	}

	row, err := q.UpdateSearchProfile(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// DeleteSearchProfile deletes a search profile.
func DeleteSearchProfile(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) error {
	result, err := q.DeleteSearchProfile(ctx, db.DeleteSearchProfileParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
