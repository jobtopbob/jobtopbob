package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

// ResumeResponse is the API response for a resume.
type ResumeResponse struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	RxResumeID      string   `json:"rxresume_id,omitempty"`
	IsBase          bool     `json:"is_base"`
	Template        string   `json:"template,omitempty"`
	Headline        string   `json:"headline,omitempty"`
	FullName        string   `json:"full_name,omitempty"`
	Email           string   `json:"email,omitempty"`
	PictureURL      string   `json:"picture_url,omitempty"`
	LatestRole      string   `json:"latest_role,omitempty"`
	PrimaryColor    string   `json:"primary_color,omitempty"`
	ExperienceCount int32    `json:"experience_count"`
	EducationCount  int32    `json:"education_count"`
	SkillsCount     int32    `json:"skills_count"`
	ProjectsCount   int32    `json:"projects_count"`
	CertsCount      int32    `json:"certs_count"`
	TopSkills       []string `json:"top_skills,omitempty"`
	SyncedAt        string   `json:"synced_at,omitempty"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

func resumeToResponse(r db.Resume) ResumeResponse {
	resp := ResumeResponse{
		ID:              uuidToString(r.ID),
		Name:            r.Name,
		RxResumeID:      r.RxresumeID.String,
		IsBase:          r.IsBase.Bool,
		Template:        r.Template.String,
		Headline:        r.Headline.String,
		FullName:        r.FullName.String,
		Email:           r.Email.String,
		PictureURL:      r.PictureUrl.String,
		LatestRole:      r.LatestRole.String,
		PrimaryColor:    r.PrimaryColor.String,
		ExperienceCount: r.ExperienceCount,
		EducationCount:  r.EducationCount,
		SkillsCount:     r.SkillsCount,
		ProjectsCount:   r.ProjectsCount,
		CertsCount:      r.CertsCount,
		TopSkills:       r.TopSkills,
		CreatedAt:       r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
	if r.SyncedAt.Valid {
		resp.SyncedAt = r.SyncedAt.Time.Format("2006-01-02T15:04:05Z")
	}
	return resp
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// rxResumeData represents the relevant parts of the RxResume JSON data for extraction.
type rxResumeData struct {
	Basics struct {
		Name     string `json:"name"`
		Headline string `json:"headline"`
		Email    string `json:"email"`
	} `json:"basics"`
	Picture struct {
		URL string `json:"url"`
	} `json:"picture"`
	Sections struct {
		Experience     sectionItems `json:"experience"`
		Education      sectionItems `json:"education"`
		Skills         sectionItems `json:"skills"`
		Projects       sectionItems `json:"projects"`
		Certifications sectionItems `json:"certifications"`
	} `json:"sections"`
	Metadata struct {
		Template string `json:"template"`
		Theme    struct {
			Primary string `json:"primary"`
		} `json:"theme"`
	} `json:"metadata"`
}

type sectionItems struct {
	Items []json.RawMessage `json:"items"`
}

type skillItem struct {
	Name string `json:"name"`
}

type experienceItem struct {
	Company  string `json:"company"`
	Position string `json:"position"`
}

// extractResumeFields parses the full RxResume JSON and returns snapshot params.
func extractResumeFields(resumeID pgtype.UUID, userID string, data json.RawMessage) db.UpdateResumeSnapshotParams {
	params := db.UpdateResumeSnapshotParams{
		ID:     resumeID,
		UserID: userID,
	}

	var rd rxResumeData
	if err := json.Unmarshal(data, &rd); err != nil {
		slog.Warn("failed to parse rxresume data for snapshot extraction", "error", err)
		return params
	}

	params.Template = pgtype.Text{String: rd.Metadata.Template, Valid: rd.Metadata.Template != ""}
	params.Headline = pgtype.Text{String: rd.Basics.Headline, Valid: rd.Basics.Headline != ""}
	params.FullName = pgtype.Text{String: rd.Basics.Name, Valid: rd.Basics.Name != ""}
	params.Email = pgtype.Text{String: rd.Basics.Email, Valid: rd.Basics.Email != ""}
	params.PictureUrl = pgtype.Text{String: rd.Picture.URL, Valid: rd.Picture.URL != ""}
	params.PrimaryColor = pgtype.Text{String: rd.Metadata.Theme.Primary, Valid: rd.Metadata.Theme.Primary != ""}

	params.ExperienceCount = int32(len(rd.Sections.Experience.Items))
	params.EducationCount = int32(len(rd.Sections.Education.Items))
	params.SkillsCount = int32(len(rd.Sections.Skills.Items))
	params.ProjectsCount = int32(len(rd.Sections.Projects.Items))
	params.CertsCount = int32(len(rd.Sections.Certifications.Items))

	// Extract latest role from first experience item
	if len(rd.Sections.Experience.Items) > 0 {
		var exp experienceItem
		if err := json.Unmarshal(rd.Sections.Experience.Items[0], &exp); err == nil && exp.Position != "" {
			role := exp.Position
			if exp.Company != "" {
				role += " at " + exp.Company
			}
			params.LatestRole = pgtype.Text{String: role, Valid: true}
		}
	}

	// Extract top skills (up to 5)
	limit := 5
	if len(rd.Sections.Skills.Items) < limit {
		limit = len(rd.Sections.Skills.Items)
	}
	if limit > 0 {
		skills := make([]string, 0, limit)
		for _, raw := range rd.Sections.Skills.Items[:limit] {
			var s skillItem
			if err := json.Unmarshal(raw, &s); err == nil && s.Name != "" {
				skills = append(skills, s.Name)
			}
		}
		params.TopSkills = skills
	}

	return params
}

// syncResumeSnapshots fetches data from RxResume and updates local snapshots for stale resumes.
func syncResumeSnapshots(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client, staleResumes []db.Resume) {
	for _, resume := range staleResumes {
		if !resume.RxresumeID.Valid || resume.RxresumeID.String == "" {
			continue
		}

		detail, err := rxClient.GetResume(ctx, resume.RxresumeID.String)
		if err != nil {
			// If 404, clear the link
			if strings.Contains(err.Error(), "404") {
				slog.Warn("rxresume not found, clearing link", "rxresume_id", resume.RxresumeID.String)
				_ = q.ClearResumeSync(ctx, db.ClearResumeSyncParams{ID: resume.ID, UserID: userID})
			} else {
				slog.Warn("failed to fetch rxresume for sync", "rxresume_id", resume.RxresumeID.String, "error", err)
			}
			continue
		}

		params := extractResumeFields(resume.ID, userID, detail.Data)
		if err := q.UpdateResumeSnapshot(ctx, params); err != nil {
			slog.Warn("failed to update resume snapshot", "resume_id", uuidToString(resume.ID), "error", err)
		}
	}
}

// ListResumes returns all resumes for a user, syncing stale snapshots from RxResume.
func ListResumes(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client) ([]ResumeResponse, error) {
	// Inline sync for stale resumes if RxResume is configured
	if rxClient.Configured() {
		stale, err := q.ListStaleResumes(ctx, userID)
		if err != nil {
			slog.Warn("failed to list stale resumes", "error", err)
		} else if len(stale) > 0 {
			syncCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			defer cancel()
			syncResumeSnapshots(syncCtx, q, userID, rxClient, stale)
		}
	}

	resumes, err := q.ListResumes(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]ResumeResponse, len(resumes))
	for i, r := range resumes {
		result[i] = resumeToResponse(r)
	}
	return result, nil
}

// CreateResumeParams holds parameters for creating a resume.
type CreateResumeParams struct {
	Name           string `json:"name"`
	Template       string `json:"template"`
	WithSampleData bool   `json:"with_sample_data"`
}

// CreateResume creates a resume locally and optionally syncs to RxResume when configured.
func CreateResume(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client, params CreateResumeParams) (ResumeResponse, error) {
	var rxResumeID pgtype.Text

	// Sync to RxResume if API key is configured
	if rxClient.Configured() {
		slug := strings.ToLower(strings.ReplaceAll(params.Name, " ", "-"))

		rxResume, err := rxClient.CreateResume(ctx, rxresume.CreateResumeRequest{
			Name:           params.Name,
			Slug:           slug,
			WithSampleData: params.WithSampleData,
		})
		if err != nil {
			// Log but don't fail — create the local record anyway
			slog.Warn("rxresume sync failed during create, proceeding with local-only record",
				"error", err, "user_id", userID, "name", params.Name)
		} else {
			rxResumeID = pgtype.Text{String: rxResume.ID, Valid: true}
		}
	}

	// Always create the local DB record
	resume, err := q.CreateResume(ctx, db.CreateResumeParams{
		UserID:     userID,
		Name:       params.Name,
		RxresumeID: rxResumeID,
		IsBase:     pgtype.Bool{Bool: false, Valid: true},
		Template:   pgtype.Text{String: params.Template, Valid: params.Template != ""},
	})
	if err != nil {
		// Clean up RxResume if we created one but local save failed
		if rxResumeID.Valid {
			if delErr := rxClient.DeleteResume(ctx, rxResumeID.String); delErr != nil {
				slog.Warn("failed to cleanup rxresume after local save failure", "error", delErr)
			}
		}
		return ResumeResponse{}, fmt.Errorf("save resume metadata: %w", err)
	}

	_ = LogActivity(ctx, q, userID, "resume", resume.ID, "created", nil, map[string]string{"name": resume.Name})
	return resumeToResponse(resume), nil
}

// GetResume returns a single resume, syncing from RxResume if stale.
func GetResume(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client, id pgtype.UUID) (ResumeResponse, error) {
	resume, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ResumeResponse{}, ErrNotFound
	}
	if err != nil {
		return ResumeResponse{}, err
	}

	// Sync if stale and linked to RxResume
	if rxClient.Configured() && resume.RxresumeID.Valid && resume.RxresumeID.String != "" {
		isStale := !resume.SyncedAt.Valid || time.Since(resume.SyncedAt.Time) > 5*time.Minute
		if isStale {
			syncCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
			defer cancel()
			syncResumeSnapshots(syncCtx, q, userID, rxClient, []db.Resume{resume})
			// Re-read after sync
			if updated, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID}); err == nil {
				resume = updated
			}
		}
	}

	return resumeToResponse(resume), nil
}

// UpdateResumeParams holds parameters for updating a resume.
type UpdateResumeParams struct {
	Name   *string `json:"name"`
	IsBase *bool   `json:"is_base"`
}

// UpdateResume updates resume metadata.
func UpdateResume(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params UpdateResumeParams) (ResumeResponse, error) {
	_, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ResumeResponse{}, ErrNotFound
	}
	if err != nil {
		return ResumeResponse{}, err
	}

	dbParams := db.UpdateResumeParams{
		ID:     id,
		UserID: userID,
	}
	if params.Name != nil {
		dbParams.Name = pgtype.Text{String: *params.Name, Valid: true}
	}
	if params.IsBase != nil {
		dbParams.IsBase = pgtype.Bool{Bool: *params.IsBase, Valid: true}
	}

	updated, err := q.UpdateResume(ctx, dbParams)
	if err != nil {
		return ResumeResponse{}, err
	}
	return resumeToResponse(updated), nil
}

// DeleteResume deletes a resume from the local DB and optionally from RxResume.
func DeleteResume(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client, id pgtype.UUID) error {
	resume, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	// Best-effort delete from RxResume if linked and configured
	if rxClient.Configured() && resume.RxresumeID.Valid && resume.RxresumeID.String != "" {
		if err := rxClient.DeleteResume(ctx, resume.RxresumeID.String); err != nil {
			slog.Warn("failed to delete from rxresume", "rxresume_id", resume.RxresumeID.String, "error", err)
		}
	}

	rows, err := q.DeleteResume(ctx, db.DeleteResumeParams{ID: id, UserID: userID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrNotFound
	}

	_ = LogActivity(ctx, q, userID, "resume", id, "deleted", nil, map[string]string{"name": resume.Name})
	return nil
}

// ExportResumePDF proxies PDF export from RxResume.
func ExportResumePDF(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client, id pgtype.UUID) (string, error) {
	if !rxClient.Configured() {
		return "", fmt.Errorf("resume builder API key not configured — set RXRESUME_API_KEY to enable PDF export")
	}

	resume, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", err
	}

	if !resume.RxresumeID.Valid || resume.RxresumeID.String == "" {
		return "", fmt.Errorf("resume is not linked to the builder — open it in the builder first")
	}

	url, err := rxClient.ExportPDF(ctx, resume.RxresumeID.String)
	if err != nil {
		return "", fmt.Errorf("export pdf: %w", err)
	}
	return url, nil
}

// SetBaseResume clears any existing base resume and sets the given one as base.
func SetBaseResume(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (ResumeResponse, error) {
	_, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ResumeResponse{}, ErrNotFound
	}
	if err != nil {
		return ResumeResponse{}, err
	}

	if err := q.ClearBaseResume(ctx, userID); err != nil {
		return ResumeResponse{}, fmt.Errorf("clear base: %w", err)
	}

	isBaseTrue := true
	return UpdateResume(ctx, q, userID, id, UpdateResumeParams{IsBase: &isBaseTrue})
}

// SyncResumes forces a full sync of all linked resumes from RxResume.
// It also discovers new resumes created directly in RxResume and imports them locally.
func SyncResumes(ctx context.Context, q *db.Queries, userID string, rxClient *rxresume.Client) ([]ResumeResponse, error) {
	if !rxClient.Configured() {
		return ListResumes(ctx, q, userID, rxClient)
	}

	syncCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Fetch all resumes from RxResume
	rxResumes, err := rxClient.ListResumes(syncCtx)
	if err != nil {
		slog.Warn("failed to list rxresume resumes during sync", "error", err)
		// Fall back to local data
		return listResumesFromDB(ctx, q, userID)
	}

	// Get all local resumes
	localResumes, err := q.ListResumes(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build a set of known rxresume_ids
	knownRxIDs := make(map[string]db.Resume, len(localResumes))
	for _, r := range localResumes {
		if r.RxresumeID.Valid && r.RxresumeID.String != "" {
			knownRxIDs[r.RxresumeID.String] = r
		}
	}

	// Discover new resumes from RxResume and create local records
	for _, rxr := range rxResumes {
		if _, exists := knownRxIDs[rxr.ID]; !exists {
			// New resume in RxResume — create a local record
			newResume, err := q.CreateResume(ctx, db.CreateResumeParams{
				UserID:     userID,
				Name:       rxr.Name,
				RxresumeID: pgtype.Text{String: rxr.ID, Valid: true},
				IsBase:     pgtype.Bool{Bool: false, Valid: true},
			})
			if err != nil {
				slog.Warn("failed to create local record for discovered rxresume", "rxresume_id", rxr.ID, "error", err)
				continue
			}
			_ = LogActivity(ctx, q, userID, "resume", newResume.ID, "imported", nil, map[string]string{"name": rxr.Name})
		}
	}

	// Re-read all local resumes (including newly created ones) and sync snapshots
	allLocal, err := q.ListResumes(ctx, userID)
	if err != nil {
		return nil, err
	}

	var linked []db.Resume
	for _, r := range allLocal {
		if r.RxresumeID.Valid && r.RxresumeID.String != "" {
			linked = append(linked, r)
		}
	}

	if len(linked) > 0 {
		syncResumeSnapshots(syncCtx, q, userID, rxClient, linked)
	}

	// Re-read after snapshot updates
	resumes, err := q.ListResumes(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]ResumeResponse, len(resumes))
	for i, r := range resumes {
		result[i] = resumeToResponse(r)
	}
	return result, nil
}

// listResumesFromDB is a helper that returns resumes from DB only (no sync).
func listResumesFromDB(ctx context.Context, q *db.Queries, userID string) ([]ResumeResponse, error) {
	resumes, err := q.ListResumes(ctx, userID)
	if err != nil {
		return nil, err
	}
	result := make([]ResumeResponse, len(resumes))
	for i, r := range resumes {
		result[i] = resumeToResponse(r)
	}
	return result, nil
}
