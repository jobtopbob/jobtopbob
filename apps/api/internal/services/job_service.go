package services

import (
	"context"
	"errors"
	"time"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// ErrNotFound is returned when a requested resource does not exist.
var ErrNotFound = errors.New("not found")

// ErrNotConfigured is returned when a required service is not configured.
var ErrNotConfigured = errors.New("not configured")

// ErrNotLinked is returned when a resource is not linked to an external service.
var ErrNotLinked = errors.New("not linked")

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
	JobTypes      []string
	JobLevels     []string
	Search        pgtype.Text
	CreatedAfter  pgtype.Timestamptz
	CreatedBefore pgtype.Timestamptz
	TagIDs        []pgtype.UUID
	SortBy        string
	SortOrder     string
	Page          int32
	PerPage       int32
}

// JobWithTags wraps a ListJobsRow with its associated tags.
type JobWithTags struct {
	db.ListJobsRow
	Tags []db.Tag `json:"tags"`
}

// ListJobsResult holds the paginated result.
type ListJobsResult struct {
	Jobs    []JobWithTags `json:"data"`
	Total   int64         `json:"total"`
	Page    int32         `json:"page"`
	PerPage int32         `json:"per_page"`
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
		JobTypes:      p.JobTypes,
		JobLevels:     p.JobLevels,
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
		JobTypes:      p.JobTypes,
		JobLevels:     p.JobLevels,
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

	// Batch-fetch tags for all jobs
	jobIDs := make([]pgtype.UUID, len(jobs))
	for i, j := range jobs {
		jobIDs[i] = j.ID
	}

	tagMap := make(map[string][]db.Tag)
	if len(jobIDs) > 0 {
		tagRows, err := q.ListTagsForEntities(ctx, db.ListTagsForEntitiesParams{
			UserID:     userID,
			EntityType: "job",
			Column3:    jobIDs,
		})
		if err != nil {
			return ListJobsResult{}, err
		}
		for _, row := range tagRows {
			eid := uuidToString(row.EntityID)
			tagMap[eid] = append(tagMap[eid], db.Tag{
				ID:        row.ID,
				UserID:    row.UserID,
				Name:      row.Name,
				Color:     row.Color,
				CreatedAt: row.CreatedAt,
				UpdatedAt: row.UpdatedAt,
			})
		}
	}

	result := make([]JobWithTags, len(jobs))
	for i, j := range jobs {
		jid := uuidToString(j.ID)
		tags := tagMap[jid]
		if tags == nil {
			tags = []db.Tag{}
		}
		result[i] = JobWithTags{ListJobsRow: j, Tags: tags}
	}

	return ListJobsResult{
		Jobs:    result,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// ensureOfferForStage checks whether stageID maps to the "offer" status and,
// if so, creates a skeleton offer for the job (best-effort, no error returned).
func ensureOfferForStage(ctx context.Context, q *db.Queries, userID string, stageID, jobID pgtype.UUID) {
	stage, err := q.GetStage(ctx, db.GetStageParams{ID: stageID, UserID: userID})
	if err != nil {
		return
	}
	if stage.MappedStatus.Valid && stage.MappedStatus.String == "offer" {
		EnsureOfferExists(ctx, q, userID, jobID)
	}
}

// CreateJob creates a new job and logs the activity.
func CreateJob(ctx context.Context, q *db.Queries, userID string, params db.CreateJobParams) (db.Job, error) {
	params.UserID = userID

	// Auto-set follow_up_at to 7 days after applied_at if not explicitly provided
	if params.AppliedAt.Valid && !params.FollowUpAt.Valid {
		params.FollowUpAt = pgtype.Timestamptz{
			Time:  params.AppliedAt.Time.AddDate(0, 0, 7),
			Valid: true,
		}
	}

	job, err := q.CreateJob(ctx, params)
	if err != nil {
		return job, err
	}

	_ = LogActivity(ctx, q, userID, "job", job.ID, "created", nil, map[string]string{"title": job.Title})
	ensureOfferForStage(ctx, q, userID, job.StageID, job.ID)
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

	// Log field changes, resolving company names for human-readable activity log
	changes := detectJobChanges(old, updated)
	if _, ok := changes["company_id"]; ok {
		resolveCompanyNames(ctx, q, userID, old, updated, changes)
	}
	if len(changes) > 0 {
		_ = LogActivity(ctx, q, userID, "job", id, "updated", nil, changes)
	}

	// Auto-create a stub offer when a job is moved to an offer-mapped stage.
	if updated.StageID != old.StageID {
		ensureOfferForStage(ctx, q, userID, updated.StageID, updated.ID)
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
// Uses dedup-aware company creation (domain-first, then name match).
func ImportJob(ctx context.Context, q *db.Queries, userID string, params db.CreateJobParams, companyName string) (db.Job, error) {
	if companyName != "" {
		company, err := CreateCompany(ctx, q, userID, CreateCompanyParams{
			Name:       companyName,
			DataSource: "email",
		})
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

	// Auto-create stub offers if the target stage is offer-mapped.
	stage, sErr := q.GetStage(ctx, db.GetStageParams{ID: stageID, UserID: userID})
	if sErr == nil && stage.MappedStatus.Valid && stage.MappedStatus.String == "offer" {
		for _, jobID := range jobIDs {
			EnsureOfferExists(ctx, q, userID, jobID)
		}
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
	TotalJobs       int64              `json:"total_jobs"`
	ByStatus        map[string]int64   `json:"by_status"`
	FollowUpsDue    int64              `json:"follow_ups_due"`
	WeeklyProgress  int64              `json:"weekly_progress"`
	WeeklyGoal      *int32             `json:"weekly_goal"`
	WeeklyStreak    int64              `json:"weekly_streak"`
	StageFunnel     []StageFunnelEntry `json:"stage_funnel"`
	SourceBreakdown []SourceEntry      `json:"source_breakdown"`
	ResponseTrend   []ResponseWeek     `json:"response_trend"`
}

// StageFunnelEntry represents a stage and its job count.
type StageFunnelEntry struct {
	Name     string `json:"name"`
	Position int32  `json:"position"`
	Color    string `json:"color"`
	Count    int64  `json:"count"`
}

// SourceEntry represents a job source and its count.
type SourceEntry struct {
	Source string `json:"source"`
	Count  int64  `json:"count"`
}

// ResponseWeek represents weekly response rate data.
type ResponseWeek struct {
	WeekStart string  `json:"week_start"`
	Total     int64   `json:"total"`
	Responded int64   `json:"responded"`
	Rate      float64 `json:"rate"`
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

	result := StatsResult{
		TotalJobs:    total,
		ByStatus:     byStatus,
		FollowUpsDue: followUps,
	}

	// Weekly goal progress
	weeklyCount, err := q.CountJobsThisWeek(ctx, userID)
	if err == nil {
		result.WeeklyProgress = weeklyCount
	}

	// Weekly goal value from settings
	settings, err := q.GetUserSettings(ctx, userID)
	if err == nil && settings.WeeklyGoal.Valid {
		result.WeeklyGoal = &settings.WeeklyGoal.Int32
	}

	// Weekly streak: count consecutive weeks where goal was met
	if result.WeeklyGoal != nil && *result.WeeklyGoal > 0 {
		since := pgtype.Timestamptz{Time: time.Now().AddDate(-1, 0, 0), Valid: true}
		weekCounts, err := q.CountJobsByWeek(ctx, db.CountJobsByWeekParams{
			UserID:    userID,
			CreatedAt: since,
		})
		if err == nil {
			result.WeeklyStreak = calculateStreak(weekCounts, int64(*result.WeeklyGoal))
		}
	}

	// Stage funnel
	funnelRows, err := q.StageFunnel(ctx, userID)
	if err == nil {
		result.StageFunnel = make([]StageFunnelEntry, len(funnelRows))
		for i, r := range funnelRows {
			color := ""
			if r.Color.Valid {
				color = r.Color.String
			}
			result.StageFunnel[i] = StageFunnelEntry{
				Name:     r.StageName,
				Position: r.Position,
				Color:    color,
				Count:    r.Count,
			}
		}
	}

	// Source breakdown
	sourceRows, err := q.JobsBySource(ctx, userID)
	if err == nil {
		result.SourceBreakdown = make([]SourceEntry, len(sourceRows))
		for i, r := range sourceRows {
			result.SourceBreakdown[i] = SourceEntry{
				Source: r.Source,
				Count:  r.Count,
			}
		}
	}

	// Response rate trend (last 8 weeks)
	trendSince := pgtype.Timestamptz{Time: time.Now().AddDate(0, 0, -56), Valid: true}
	trendRows, err := q.ResponseRateByWeek(ctx, db.ResponseRateByWeekParams{
		UserID:    userID,
		CreatedAt: trendSince,
	})
	if err == nil {
		result.ResponseTrend = make([]ResponseWeek, len(trendRows))
		for i, r := range trendRows {
			rate := 0.0
			if r.Total > 0 {
				rate = float64(r.Responded) / float64(r.Total) * 100
			}
			weekStr := ""
			if r.WeekStart.Valid {
				weekStr = r.WeekStart.Time.Format("2006-01-02")
			}
			result.ResponseTrend[i] = ResponseWeek{
				WeekStart: weekStr,
				Total:     r.Total,
				Responded: r.Responded,
				Rate:      rate,
			}
		}
	}

	return result, nil
}

// calculateStreak counts consecutive past weeks where applications >= goal.
func calculateStreak(weeks []db.CountJobsByWeekRow, goal int64) int64 {
	if len(weeks) == 0 {
		return 0
	}

	// Build a map of week_start -> count
	weekMap := make(map[string]int64)
	for _, w := range weeks {
		if w.WeekStart.Valid {
			weekMap[w.WeekStart.Time.Format("2006-01-02")] = w.Count
		}
	}

	// Walk backwards from the last completed week
	now := time.Now()
	// Find the start of last week (completed)
	weekStart := now.Truncate(24 * time.Hour)
	for weekStart.Weekday() != time.Monday {
		weekStart = weekStart.AddDate(0, 0, -1)
	}
	weekStart = weekStart.AddDate(0, 0, -7) // last completed week

	var streak int64
	for i := 0; i < 52; i++ {
		key := weekStart.Format("2006-01-02")
		if count, ok := weekMap[key]; ok && count >= goal {
			streak++
		} else {
			break
		}
		weekStart = weekStart.AddDate(0, 0, -7)
	}

	return streak
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
	if old.Source != updated.Source {
		changes["source"] = map[string]pgtype.Text{"old": old.Source, "new": updated.Source}
	}
	if old.JobType != updated.JobType {
		changes["job_type"] = map[string]pgtype.Text{"old": old.JobType, "new": updated.JobType}
	}
	if old.JobLevel != updated.JobLevel {
		changes["job_level"] = map[string]pgtype.Text{"old": old.JobLevel, "new": updated.JobLevel}
	}
	if old.SalaryMin != updated.SalaryMin {
		changes["salary_min"] = map[string]pgtype.Int4{"old": old.SalaryMin, "new": updated.SalaryMin}
	}
	if old.SalaryMax != updated.SalaryMax {
		changes["salary_max"] = map[string]pgtype.Int4{"old": old.SalaryMax, "new": updated.SalaryMax}
	}
	if old.SalaryOffered != updated.SalaryOffered {
		changes["salary_offered"] = map[string]pgtype.Int4{"old": old.SalaryOffered, "new": updated.SalaryOffered}
	}
	if old.SalaryCurrency != updated.SalaryCurrency {
		changes["salary_currency"] = map[string]pgtype.Text{"old": old.SalaryCurrency, "new": updated.SalaryCurrency}
	}
	if old.SalaryInterval != updated.SalaryInterval {
		changes["salary_interval"] = map[string]pgtype.Text{"old": old.SalaryInterval, "new": updated.SalaryInterval}
	}
	if old.Interest != updated.Interest {
		changes["interest"] = map[string]pgtype.Int4{"old": old.Interest, "new": updated.Interest}
	}
	if old.Suitability != updated.Suitability {
		changes["suitability"] = map[string]pgtype.Int4{"old": old.Suitability, "new": updated.Suitability}
	}
	if old.ExperienceRange != updated.ExperienceRange {
		changes["experience_range"] = map[string]pgtype.Text{"old": old.ExperienceRange, "new": updated.ExperienceRange}
	}
	if old.AppliedAt != updated.AppliedAt {
		changes["applied_at"] = map[string]pgtype.Timestamptz{"old": old.AppliedAt, "new": updated.AppliedAt}
	}
	if old.FollowUpAt != updated.FollowUpAt {
		changes["follow_up_at"] = map[string]pgtype.Timestamptz{"old": old.FollowUpAt, "new": updated.FollowUpAt}
	}
	if old.Deadline != updated.Deadline {
		changes["deadline"] = map[string]pgtype.Timestamptz{"old": old.Deadline, "new": updated.Deadline}
	}
	if old.CloseReason != updated.CloseReason {
		changes["close_reason"] = map[string]pgtype.Text{"old": old.CloseReason, "new": updated.CloseReason}
	}
	if old.JdRaw != updated.JdRaw {
		changes["jd_raw"] = map[string]pgtype.Text{"old": old.JdRaw, "new": updated.JdRaw}
	}

	return changes
}

// resolveCompanyNames replaces the raw company_id UUID change entry with
// human-readable company names for the activity log.
func resolveCompanyNames(ctx context.Context, q *db.Queries, userID string, old db.GetJobRow, updated db.Job, changes map[string]any) {
	oldName := ""
	newName := ""

	// Old company name is available from the GetJob JOIN
	if old.CompanyName.Valid {
		oldName = old.CompanyName.String
	}

	// New company name needs a lookup
	if updated.CompanyID.Valid {
		company, err := q.GetCompany(ctx, db.GetCompanyParams{
			ID:     updated.CompanyID,
			UserID: userID,
		})
		if err == nil {
			newName = company.Name
		}
	}

	changes["company_id"] = map[string]string{
		"old": oldName,
		"new": newName,
	}
}
