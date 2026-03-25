package services

import (
	"context"
	"errors"
	"net/url"
	"strings"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// GetCompany returns a single company with its job count.
func GetCompany(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetCompanyWithJobCountRow, error) {
	row, err := q.GetCompanyWithJobCount(ctx, db.GetCompanyWithJobCountParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListCompanies returns all companies for a user with job counts.
func ListCompanies(ctx context.Context, q *db.Queries, userID string) ([]db.ListCompaniesWithJobCountRow, error) {
	return q.ListCompaniesWithJobCount(ctx, userID)
}

// CreateCompanyParams holds the input for creating a company.
type CreateCompanyParams struct {
	Name          string
	Website       string
	Description   string
	Industry      string
	Size          string
	Location      string
	FoundedYear   *int32
	LinkedinURL   string
	EmployeeCount *int32
	Interest      *int32
	Notes         string
	LogoURL       string
	DataSource    string
}

// CreateCompany creates a new company, normalizing the domain from the website.
// It performs deduplication by domain (primary) and name (secondary).
// When a duplicate is found, any new non-empty fields from the incoming params
// are merged into the existing record (fill gaps, never overwrite).
func CreateCompany(ctx context.Context, q *db.Queries, userID string, p CreateCompanyParams) (db.Company, error) {
	domain := NormalizeDomain(p.Website)

	// Dedup by domain
	if domain != "" {
		existing, err := q.FindCompanyByDomain(ctx, db.FindCompanyByDomainParams{
			UserID: userID,
			Domain: pgtype.Text{String: domain, Valid: true},
		})
		if err == nil {
			return mergeCompanyData(ctx, q, userID, existing, p, domain)
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return db.Company{}, err
		}
	}

	// Dedup by name
	matches, err := q.FindCompanyByNameFuzzy(ctx, db.FindCompanyByNameFuzzyParams{
		UserID: userID,
		Lower:  p.Name,
	})
	if err != nil {
		return db.Company{}, err
	}
	if len(matches) > 0 {
		return mergeCompanyData(ctx, q, userID, matches[0], p, domain)
	}

	dataSource := p.DataSource
	if dataSource == "" {
		dataSource = "manual"
	}

	return q.CreateCompany(ctx, db.CreateCompanyParams{
		UserID:        userID,
		Name:          p.Name,
		Domain:        pgtype.Text{String: domain, Valid: domain != ""},
		Website:       pgtextVal(p.Website),
		Description:   pgtextVal(p.Description),
		Industry:      pgtextVal(p.Industry),
		Size:          pgtextVal(p.Size),
		Location:      pgtextVal(p.Location),
		FoundedYear:   pgintVal(p.FoundedYear),
		LinkedinUrl:   pgtextVal(p.LinkedinURL),
		EmployeeCount: pgintVal(p.EmployeeCount),
		Interest:      pgintVal(p.Interest),
		Notes:         pgtextVal(p.Notes),
		LogoUrl:       pgtextVal(p.LogoURL),
		DataSource:    dataSource,
	})
}

// mergeCompanyData fills in empty fields on an existing company with values from
// the incoming params. Fields that already have values are never overwritten.
// Returns the existing record unchanged if no new data would be added.
func mergeCompanyData(ctx context.Context, q *db.Queries, userID string, existing db.Company, p CreateCompanyParams, domain string) (db.Company, error) {
	// Build update params — only set fields where the existing record is empty
	// AND the incoming params have a value.
	update := db.UpdateCompanyParams{
		ID:     existing.ID,
		UserID: userID,
	}

	needsUpdate := false

	if !existing.Domain.Valid && domain != "" {
		update.Domain = pgtype.Text{String: domain, Valid: true}
		needsUpdate = true
	}
	if !existing.Website.Valid && p.Website != "" {
		update.Website = pgtype.Text{String: p.Website, Valid: true}
		needsUpdate = true
	}
	if !existing.Description.Valid && p.Description != "" {
		update.Description = pgtype.Text{String: p.Description, Valid: true}
		needsUpdate = true
	}
	if !existing.Industry.Valid && p.Industry != "" {
		update.Industry = pgtype.Text{String: p.Industry, Valid: true}
		needsUpdate = true
	}
	if !existing.Size.Valid && p.Size != "" {
		update.Size = pgtype.Text{String: p.Size, Valid: true}
		needsUpdate = true
	}
	if !existing.Location.Valid && p.Location != "" {
		update.Location = pgtype.Text{String: p.Location, Valid: true}
		needsUpdate = true
	}
	if !existing.FoundedYear.Valid && p.FoundedYear != nil {
		update.FoundedYear = pgtype.Int4{Int32: *p.FoundedYear, Valid: true}
		needsUpdate = true
	}
	if !existing.LinkedinUrl.Valid && p.LinkedinURL != "" {
		update.LinkedinUrl = pgtype.Text{String: p.LinkedinURL, Valid: true}
		needsUpdate = true
	}
	if !existing.EmployeeCount.Valid && p.EmployeeCount != nil {
		update.EmployeeCount = pgtype.Int4{Int32: *p.EmployeeCount, Valid: true}
		needsUpdate = true
	}
	if !existing.LogoUrl.Valid && p.LogoURL != "" {
		update.LogoUrl = pgtype.Text{String: p.LogoURL, Valid: true}
		needsUpdate = true
	}

	// Don't merge notes or interest — those are user-intent fields, not enrichment data
	// Don't merge name — the existing name was set first and should be authoritative

	if !needsUpdate {
		return existing, nil
	}

	updated, err := q.UpdateCompany(ctx, update)
	if err != nil {
		// Non-critical: return existing record if merge fails
		return existing, nil
	}
	return updated, nil
}

// UpdateCompanyParams holds the input for updating a company.
type UpdateCompanyParams struct {
	Name          *string
	Website       *string
	Description   *string
	Industry      *string
	Size          *string
	Location      *string
	FoundedYear   *int32
	LinkedinURL   *string
	EmployeeCount *int32
	Interest      *int32
	Notes         *string
	LogoURL       *string
}

// UpdateCompany updates a company's fields. Only non-nil fields are updated.
func UpdateCompany(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, p UpdateCompanyParams) (db.Company, error) {
	// If website is being updated, also update domain
	var domainParam pgtype.Text
	if p.Website != nil {
		d := NormalizeDomain(*p.Website)
		if d != "" {
			domainParam = pgtype.Text{String: d, Valid: true}
		}
	}

	row, err := q.UpdateCompany(ctx, db.UpdateCompanyParams{
		ID:            id,
		UserID:        userID,
		Name:          pgtextPtr(p.Name),
		Domain:        domainParam,
		Website:       pgtextPtr(p.Website),
		Description:   pgtextPtr(p.Description),
		Industry:      pgtextPtr(p.Industry),
		Size:          pgtextPtr(p.Size),
		Location:      pgtextPtr(p.Location),
		FoundedYear:   pgintVal(p.FoundedYear),
		LinkedinUrl:   pgtextPtr(p.LinkedinURL),
		EmployeeCount: pgintVal(p.EmployeeCount),
		Interest:      pgintVal(p.Interest),
		Notes:         pgtextPtr(p.Notes),
		LogoUrl:       pgtextPtr(p.LogoURL),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// DeleteCompany deletes a company by ID.
func DeleteCompany(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteCompany(ctx, db.DeleteCompanyParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// SearchCompanies searches companies by name or domain substring.
func SearchCompanies(ctx context.Context, q *db.Queries, userID string, query string) ([]db.Company, error) {
	return q.SearchCompanies(ctx, db.SearchCompaniesParams{
		UserID:  userID,
		Column2: pgtype.Text{String: query, Valid: true},
	})
}

// NormalizeDomain extracts and normalizes a domain from a URL or raw domain string.
// e.g. "https://www.Stripe.com/" → "stripe.com"
func NormalizeDomain(raw string) string {
	if raw == "" {
		return ""
	}

	// If it doesn't have a scheme, add one for url.Parse
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}

	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}

	host := u.Hostname()
	host = strings.ToLower(host)
	host = strings.TrimPrefix(host, "www.")
	return host
}

// pgtextVal returns a pgtype.Text with Valid=true if the string is non-empty.
func pgtextVal(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

// pgtextPtr returns a pgtype.Text from a string pointer. Valid if pointer is non-nil.
func pgtextPtr(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// pgintVal returns a pgtype.Int4 from an int32 pointer. Valid if pointer is non-nil.
func pgintVal(v *int32) pgtype.Int4 {
	if v == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: *v, Valid: true}
}
