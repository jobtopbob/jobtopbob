package tasks

import (
	"context"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/enrichment"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

// CompanyEnrichPayload is the payload for the company:enrich task.
type CompanyEnrichPayload struct {
	UserID    string `json:"user_id"`
	CompanyID string `json:"company_id"`
}

// CompanyEnrichDeps holds dependencies for the company enrichment task.
type CompanyEnrichDeps struct {
	Pool       *pgxpool.Pool
	Redis      *redis.Client
	Store      *storage.Client       // RustFS storage for logo downloads
	HTTPClient *http.Client          // for downloading external logos
	Providers  []enrichment.Provider // ordered by priority (highest first)
}

// HandleCompanyEnrich returns an Asynq handler for the company:enrich task.
func HandleCompanyEnrich(deps *CompanyEnrichDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload CompanyEnrichPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return fmt.Errorf("unmarshal payload: %w", err)
		}

		slog.Info("enriching company", "user_id", payload.UserID, "company_id", payload.CompanyID,
			"providers", providerNames(deps.Providers))

		q := db.New(deps.Pool)

		var companyUUID pgtype.UUID
		if err := companyUUID.Scan(payload.CompanyID); err != nil {
			return fmt.Errorf("parse company_id: %w", err)
		}

		company, err := q.GetCompany(ctx, db.GetCompanyParams{
			ID:     companyUUID,
			UserID: payload.UserID,
		})
		if err != nil {
			return fmt.Errorf("get company: %w", err)
		}

		// Resolve domain
		domain := company.Domain.String
		if !company.Domain.Valid && company.Website.Valid {
			domain = normalizeDomainForEnrich(company.Website.String)
		}

		if domain == "" {
			slog.Info("skipping enrichment — no domain available", "company", company.Name)
			_, _ = q.UpdateCompanyEnrichment(ctx, db.UpdateCompanyEnrichmentParams{
				ID:               companyUUID,
				UserID:           payload.UserID,
				EnrichmentStatus: "failed",
			})
			return nil
		}

		// Run providers in priority order, accumulating results
		acc := &enrichment.Accumulator{}
		anySuccess := false

		for _, provider := range deps.Providers {
			result, err := provider.Enrich(ctx, domain)

			if err != nil {
				slog.Warn("enrichment provider failed",
					"provider", provider.Name(), "domain", domain, "error", err)
				logEnrichment(ctx, q, companyUUID, payload.UserID, provider.Name(), "failed", nil, err.Error())
				continue
			}

			if result == nil || result.IsEmpty() {
				slog.Info("enrichment provider returned no data",
					"provider", provider.Name(), "domain", domain)
				logEnrichment(ctx, q, companyUUID, payload.UserID, provider.Name(), "skipped", nil, "")
				continue
			}

			applied := acc.Merge(result)
			if len(applied) > 0 {
				anySuccess = true
				slog.Info("enrichment provider contributed data",
					"provider", provider.Name(), "domain", domain, "fields", applied)
				logEnrichment(ctx, q, companyUUID, payload.UserID, provider.Name(), "success", applied, "")
			} else {
				logEnrichment(ctx, q, companyUUID, payload.UserID, provider.Name(), "skipped", nil, "all fields already set")
			}
		}

		// Download and store logo in RustFS if we got an external logo URL
		if acc.LogoURL != nil && *acc.LogoURL != "" && deps.Store != nil {
			stored := downloadAndStoreLogo(ctx, deps, payload.CompanyID, *acc.LogoURL)
			if stored != "" {
				acc.LogoURL = &stored
			}
		}

		// Determine final status
		status := "failed"
		if anySuccess {
			status = "enriched"
		}

		// Apply accumulated results — only fill gaps on the existing company
		updated, err := q.UpdateCompanyEnrichment(ctx, db.UpdateCompanyEnrichmentParams{
			ID:               companyUUID,
			UserID:           payload.UserID,
			EnrichmentStatus: status,
			Description:      pgtextFromPtr(acc.Description, company.Description),
			Industry:         pgtextFromPtr(acc.Industry, company.Industry),
			Size:             pgtextFromPtr(acc.Size, company.Size),
			Location:         pgtextFromPtr(acc.Location, company.Location),
			FoundedYear:      pgintFromPtr(acc.FoundedYear, company.FoundedYear),
			LinkedinUrl:      pgtextFromPtr(acc.LinkedinURL, company.LinkedinUrl),
			EmployeeCount:    pgintFromPtr(acc.EmployeeCount, company.EmployeeCount),
			LogoUrl:          pgtextFromPtr(acc.LogoURL, company.LogoUrl),
			Domain:           pgtextFromPtr(&domain, company.Domain),
			DataSource:       pgtextFromPtr(enrichment.StrPtr("api"), pgtype.Text{}),
		})
		if err != nil {
			return fmt.Errorf("update enrichment: %w", err)
		}

		slog.Info("company enrichment complete", "company", updated.Name, "domain", domain, "status", status)

		// SSE notification
		if deps.Redis != nil {
			ssePayload, _ := json.Marshal(map[string]interface{}{
				"type": "company_enriched",
				"data": map[string]interface{}{
					"id":     updated.ID,
					"name":   updated.Name,
					"status": status,
				},
			})
			deps.Redis.Publish(ctx, fmt.Sprintf("sse:%s", payload.UserID), string(ssePayload))
		}

		return nil
	}
}

// logEnrichment writes a row to the enrichment_logs table.
func logEnrichment(ctx context.Context, q *db.Queries, companyID pgtype.UUID, userID, provider, status string, fieldsSet []string, errMsg string) {
	_, err := q.CreateEnrichmentLog(ctx, db.CreateEnrichmentLogParams{
		CompanyID: companyID,
		UserID:    userID,
		Provider:  provider,
		Status:    status,
		FieldsSet: fieldsSet,
		Error:     pgtype.Text{String: errMsg, Valid: errMsg != ""},
	})
	if err != nil {
		slog.Warn("failed to write enrichment log", "provider", provider, "error", err)
	}
}

// downloadAndStoreLogo downloads an external logo URL and stores it in RustFS.
// Returns the RustFS URL on success, or empty string on failure.
func downloadAndStoreLogo(ctx context.Context, deps *CompanyEnrichDeps, companyID string, externalURL string) string {
	client := deps.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	req, err := http.NewRequestWithContext(ctx, "GET", externalURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobTopBob/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("failed to download logo", "url", externalURL, "error", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return ""
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 5<<20)) // 5 MB limit
	if err != nil {
		return ""
	}

	// Determine content type and extension
	contentType := resp.Header.Get("Content-Type")
	ext := ".png" // default
	switch {
	case strings.Contains(contentType, "svg"):
		ext = ".svg"
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		ext = ".jpg"
	case strings.Contains(contentType, "webp"):
		ext = ".webp"
	case strings.Contains(contentType, "gif"):
		ext = ".gif"
	case strings.Contains(contentType, "png"):
		ext = ".png"
	default:
		// Try from URL path
		if urlExt := path.Ext(externalURL); urlExt != "" {
			ext = urlExt
		}
	}

	key := fmt.Sprintf("logos/companies/%s%s", companyID, ext)
	storedURL, err := deps.Store.Upload(ctx, key, bytes.NewReader(body), contentType)
	if err != nil {
		slog.Warn("failed to store logo in RustFS", "company_id", companyID, "error", err)
		return ""
	}

	slog.Info("logo stored in RustFS", "company_id", companyID, "key", key)
	return storedURL
}

// providerNames returns a comma-separated list of provider names.
func providerNames(providers []enrichment.Provider) string {
	names := make([]string, len(providers))
	for i, p := range providers {
		names[i] = p.Name()
	}
	return strings.Join(names, ",")
}

// normalizeDomainForEnrich extracts a domain from a URL string.
func normalizeDomainForEnrich(raw string) string {
	if raw == "" {
		return ""
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	raw = strings.TrimPrefix(raw, "https://")
	raw = strings.TrimPrefix(raw, "http://")
	if idx := strings.IndexByte(raw, '/'); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.ToLower(raw)
	raw = strings.TrimPrefix(raw, "www.")
	return raw
}

// pgtextFromPtr returns a pgtype.Text for enrichment — only sets the value
// if the pointer is non-nil, the string is non-empty, AND the existing field is empty.
func pgtextFromPtr(newVal *string, existing pgtype.Text) pgtype.Text {
	if newVal != nil && *newVal != "" && !existing.Valid {
		return pgtype.Text{String: *newVal, Valid: true}
	}
	return pgtype.Text{}
}

// pgintFromPtr returns a pgtype.Int4 for enrichment — only sets the value
// if the pointer is non-nil AND the existing field is empty.
func pgintFromPtr(newVal *int32, existing pgtype.Int4) pgtype.Int4 {
	if newVal != nil && !existing.Valid {
		return pgtype.Int4{Int32: *newVal, Valid: true}
	}
	return pgtype.Int4{}
}
