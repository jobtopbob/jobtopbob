package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

// ResumeResponse is the API response for a resume.
type ResumeResponse struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	RxResumeID string `json:"rxresume_id,omitempty"`
	IsBase     bool   `json:"is_base"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

func resumeToResponse(r db.Resume) ResumeResponse {
	return ResumeResponse{
		ID:         uuidToString(r.ID),
		Name:       r.Name,
		RxResumeID: r.RxresumeID.String,
		IsBase:     r.IsBase.Bool,
		CreatedAt:  r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:  r.UpdatedAt.Time.Format("2006-01-02T15:04:05Z"),
	}
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// ListResumes returns all resumes for a user.
func ListResumes(ctx context.Context, q *db.Queries, userID string) ([]ResumeResponse, error) {
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

// GetResume returns a single resume.
func GetResume(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (ResumeResponse, error) {
	resume, err := q.GetResume(ctx, db.GetResumeParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return ResumeResponse{}, ErrNotFound
	}
	if err != nil {
		return ResumeResponse{}, err
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
