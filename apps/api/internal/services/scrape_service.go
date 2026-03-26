package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ListScrapeRunsParams holds pagination parameters.
type ListScrapeRunsParams struct {
	Page    int32
	PerPage int32
}

// ListScrapeRunsResult holds the paginated result.
type ListScrapeRunsResult struct {
	Data    []db.ListScrapeRunsRow `json:"data"`
	Total   int64                  `json:"total"`
	Page    int32                  `json:"page"`
	PerPage int32                  `json:"per_page"`
}

// ListScrapeRuns returns a paginated list of scrape runs.
func ListScrapeRuns(ctx context.Context, q *db.Queries, userID string, p ListScrapeRunsParams) (ListScrapeRunsResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 25
	} else if p.PerPage > 100 {
		p.PerPage = 100
	}

	offset := (p.Page - 1) * p.PerPage

	total, err := q.CountScrapeRuns(ctx, userID)
	if err != nil {
		return ListScrapeRunsResult{}, err
	}

	runs, err := q.ListScrapeRuns(ctx, db.ListScrapeRunsParams{
		UserID: userID,
		Limit:  p.PerPage,
		Offset: offset,
	})
	if err != nil {
		return ListScrapeRunsResult{}, err
	}

	return ListScrapeRunsResult{
		Data:    runs,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// GetScrapeRun returns a single scrape run.
func GetScrapeRun(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetScrapeRunRow, error) {
	row, err := q.GetScrapeRun(ctx, db.GetScrapeRunParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListDiscoveredJobsParams holds filter/pagination parameters.
type ListDiscoveredJobsParams struct {
	ScrapeRunID pgtype.UUID
	Search      pgtype.Text
	Page        int32
	PerPage     int32
}

// ListDiscoveredJobsResult holds the paginated result.
type ListDiscoveredJobsResult struct {
	Data    []db.ListDiscoveredJobsRow `json:"data"`
	Total   int64                      `json:"total"`
	Page    int32                      `json:"page"`
	PerPage int32                      `json:"per_page"`
}

// ListDiscoveredJobs returns paginated discovered jobs.
func ListDiscoveredJobs(ctx context.Context, q *db.Queries, userID string, p ListDiscoveredJobsParams) (ListDiscoveredJobsResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 25
	} else if p.PerPage > 100 {
		p.PerPage = 100
	}

	offset := (p.Page - 1) * p.PerPage

	total, err := q.CountDiscoveredJobs(ctx, db.CountDiscoveredJobsParams{
		UserID:      userID,
		ScrapeRunID: p.ScrapeRunID,
		Search:      p.Search,
	})
	if err != nil {
		return ListDiscoveredJobsResult{}, err
	}

	jobs, err := q.ListDiscoveredJobs(ctx, db.ListDiscoveredJobsParams{
		UserID:      userID,
		ScrapeRunID: p.ScrapeRunID,
		Search:      p.Search,
		Limit:       p.PerPage,
		Offset:      offset,
	})
	if err != nil {
		return ListDiscoveredJobsResult{}, err
	}

	return ListDiscoveredJobsResult{
		Data:    jobs,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}
