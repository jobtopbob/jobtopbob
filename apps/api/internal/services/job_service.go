package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("not found")

// GetJob returns a single job with company and stage names joined.
func GetJob(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetJobRow, error) {
	row, err := q.GetJob(ctx, db.GetJobParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListJobsParams holds all filter/pagination parameters for listing jobs.
type ListJobsParams struct {
	Statuses      []string
	StageIDs      []pgtype.UUID
	LocationTypes []string
	Sources       []string
	Search        pgtype.Text
	CreatedAfter  pgtype.Timestamptz
	CreatedBefore pgtype.Timestamptz
	TagIDs        []pgtype.UUID
	SortBy        string
	SortOrder     string
	Page          int32
	PerPage       int32
}

// ListJobsResult holds the paginated result.
type ListJobsResult struct {
	Jobs    []db.ListJobsRow `json:"data"`
	Total   int64            `json:"total"`
	Page    int32            `json:"page"`
	PerPage int32            `json:"per_page"`
}

// ListJobs returns a paginated, filtered list of jobs.
func ListJobs(ctx context.Context, q *db.Queries, userID string, p ListJobsParams) (ListJobsResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 25
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

	filterParams := db.CountJobsParams{
		UserID:        userID,
		Statuses:      p.Statuses,
		StageIds:      p.StageIDs,
		LocationTypes: p.LocationTypes,
		Sources:       p.Sources,
		Search:        p.Search,
		CreatedAfter:  p.CreatedAfter,
		CreatedBefore: p.CreatedBefore,
		TagIds:        p.TagIDs,
	}

	total, err := q.CountJobs(ctx, filterParams)
	if err != nil {
		return ListJobsResult{}, err
	}

	jobs, err := q.ListJobs(ctx, db.ListJobsParams{
		UserID:        userID,
		Limit:         p.PerPage,
		Offset:        offset,
		Statuses:      p.Statuses,
		StageIds:      p.StageIDs,
		LocationTypes: p.LocationTypes,
		Sources:       p.Sources,
		Search:        p.Search,
		CreatedAfter:  p.CreatedAfter,
		CreatedBefore: p.CreatedBefore,
		TagIds:        p.TagIDs,
		SortBy:        p.SortBy,
		SortOrder:     p.SortOrder,
	})
	if err != nil {
		return ListJobsResult{}, err
	}

	return ListJobsResult{
		Jobs:    jobs,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// CreateJob creates a new job and logs the activity.
func CreateJob(ctx context.Context, q *db.Queries, userID string, params db.CreateJobParams) (db.Job, error) {
	params.UserID = userID
	job, err := q.CreateJob(ctx, params)
	if err != nil {
		return job, err
	}

	_ = LogActivity(ctx, q, userID, "job", job.ID, "created", nil, map[string]string{"title": job.Title})
	return job, nil
}

// UpdateJob updates a job, detects field changes, and logs activity.
func UpdateJob(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params db.UpdateJobParams) (db.Job, error) {
	// Fetch current state for change detection
	old, err := q.GetJob(ctx, db.GetJobParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Job{}, ErrNotFound
	}
	if err != nil {
		return db.Job{}, err
	}

	params.ID = id
	params.UserID = userID
	updated, err := q.UpdateJob(ctx, params)
	if err != nil {
		return updated, err
	}

	// Log field changes
	changes := detectJobChanges(old, updated)
	if len(changes) > 0 {
		_ = LogActivity(ctx, q, userID, "job", id, "updated", nil, changes)
	}

	return updated, nil
}

// DeleteJob deletes a job and logs activity.
func DeleteJob(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteJob(ctx, db.DeleteJobParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	rows := result.RowsAffected()
	if rows > 0 {
		_ = LogActivity(ctx, q, userID, "job", id, "deleted", nil, nil)
	}
	return rows, nil
}

// ImportJob creates a job from an external source, optionally resolving the company by name.
func ImportJob(ctx context.Context, q *db.Queries, userID string, params db.CreateJobParams, companyName string) (db.Job, error) {
	if companyName != "" {
		company, err := q.FindCompanyByName(ctx, db.FindCompanyByNameParams{
			UserID: userID,
			Name:   companyName,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			company, err = q.CreateCompany(ctx, db.CreateCompanyParams{
				UserID: userID,
				Name:   companyName,
			})
		}
		if err != nil {
			return db.Job{}, err
		}
		params.CompanyID = company.ID
	}

	params.UserID = userID
	job, err := q.CreateJob(ctx, params)
	if err != nil {
		return job, err
	}

	_ = LogActivity(ctx, q, userID, "job", job.ID, "imported", nil, map[string]string{"title": job.Title, "source": params.Source.String})
	return job, nil
}

// BulkUpdateStage updates the stage for multiple jobs.
func BulkUpdateStage(ctx context.Context, q *db.Queries, userID string, jobIDs []pgtype.UUID, stageID pgtype.UUID) (int64, error) {
	result, err := q.BulkUpdateJobStage(ctx, db.BulkUpdateJobStageParams{
		StageID: stageID,
		Column2: jobIDs,
		UserID:  userID,
	})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// BulkUpdateStatus updates the status for multiple jobs.
func BulkUpdateStatus(ctx context.Context, q *db.Queries, userID string, jobIDs []pgtype.UUID, status string) (int64, error) {
	result, err := q.BulkUpdateJobStatus(ctx, db.BulkUpdateJobStatusParams{
		Status:  pgtype.Text{String: status, Valid: true},
		Column2: jobIDs,
		UserID:  userID,
	})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// BulkDelete deletes multiple jobs.
func BulkDelete(ctx context.Context, q *db.Queries, userID string, jobIDs []pgtype.UUID) (int64, error) {
	result, err := q.BulkDeleteJobs(ctx, db.BulkDeleteJobsParams{
		Column1: jobIDs,
		UserID:  userID,
	})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// StatsResult holds job statistics.
type StatsResult struct {
	TotalJobs    int64            `json:"total_jobs"`
	ByStatus     map[string]int64 `json:"by_status"`
	FollowUpsDue int64            `json:"follow_ups_due"`
}

// GetStats returns job statistics for a user.
func GetStats(ctx context.Context, q *db.Queries, userID string) (StatsResult, error) {
	statusCounts, err := q.CountJobsByStatus(ctx, userID)
	if err != nil {
		return StatsResult{}, err
	}

	followUps, err := q.CountFollowUpsDue(ctx, userID)
	if err != nil {
		return StatsResult{}, err
	}

	byStatus := make(map[string]int64)
	var total int64
	for _, sc := range statusCounts {
		byStatus[sc.Status] = sc.Count
		total += sc.Count
	}

	return StatsResult{
		TotalJobs:    total,
		ByStatus:     byStatus,
		FollowUpsDue: followUps,
	}, nil
}

// detectJobChanges compares old and new job states and returns changed fields.
func detectJobChanges(old db.GetJobRow, updated db.Job) map[string]any {
	changes := make(map[string]any)

	if old.Title != updated.Title {
		changes["title"] = map[string]string{"old": old.Title, "new": updated.Title}
	}
	if old.Status != updated.Status {
		changes["status"] = map[string]pgtype.Text{"old": old.Status, "new": updated.Status}
	}
	if old.StageID != updated.StageID {
		changes["stage_id"] = map[string]pgtype.UUID{"old": old.StageID, "new": updated.StageID}
	}
	if old.CompanyID != updated.CompanyID {
		changes["company_id"] = map[string]pgtype.UUID{"old": old.CompanyID, "new": updated.CompanyID}
	}
	if old.Location != updated.Location {
		changes["location"] = map[string]pgtype.Text{"old": old.Location, "new": updated.Location}
	}
	if old.LocationType != updated.LocationType {
		changes["location_type"] = map[string]pgtype.Text{"old": old.LocationType, "new": updated.LocationType}
	}
	if old.Interest != updated.Interest {
		changes["interest"] = map[string]pgtype.Int4{"old": old.Interest, "new": updated.Interest}
	}

	return changes
}
