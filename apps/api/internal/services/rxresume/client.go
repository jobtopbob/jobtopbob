// Package rxresume provides a client for Reactive Resume v5.
// It reads resume data directly from RxResume's database (shared PostgreSQL server)
// for per-user sync, and falls back to the OpenAPI (x-api-key) for write operations.
package rxresume

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Client communicates with a Reactive Resume v5 instance.
type Client struct {
	baseURL           string
	apiKey            string
	printerHTTPURL    string        // Browserless Chromium HTTP endpoint for direct PDF generation
	printerAppURL     string        // URL the printer uses to reach the resume builder (Docker-internal)
	rxDB              *pgxpool.Pool // read-only connection to rxresume database
	httpClient        *http.Client
}

// Resume is the list-level representation returned by RxResume (no data field).
type Resume struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Slug      string   `json:"slug"`
	Tags      []string `json:"tags"`
	IsPublic  bool     `json:"isPublic"`
	IsLocked  bool     `json:"isLocked"`
	CreatedAt string   `json:"createdAt"`
	UpdatedAt string   `json:"updatedAt"`
}

// ResumeDetail includes the full data payload.
type ResumeDetail struct {
	Resume
	Data json.RawMessage `json:"data"`
}

// CreateResumeRequest is the body for POST /api/openapi/resumes.
type CreateResumeRequest struct {
	Name           string   `json:"name"`
	Slug           string   `json:"slug"`
	Tags           []string `json:"tags,omitempty"`
	WithSampleData bool     `json:"withSampleData,omitempty"`
}

// PDFResponse is the response from the PDF export endpoint.
type PDFResponse struct {
	URL string `json:"url"`
}

// NewClient creates a new RxResume client.
// rxDB is an optional read-only connection to the rxresume database for per-user sync.
// apiKey is optional and used for write operations via the OpenAPI.
// printerHTTPURL is the Browserless Chromium HTTP endpoint for direct PDF generation.
func NewClient(baseURL, apiKey, printerHTTPURL, printerAppURL string, rxDB *pgxpool.Pool) *Client {
	return &Client{
		baseURL:        strings.TrimRight(baseURL, "/"),
		apiKey:         apiKey,
		printerHTTPURL: strings.TrimRight(printerHTTPURL, "/"),
		printerAppURL:  strings.TrimRight(printerAppURL, "/"),
		rxDB:           rxDB,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// BuilderConfigured returns true if the resume builder URL is set.
func (c *Client) BuilderConfigured() bool {
	return c.baseURL != ""
}

// Configured returns true if the client can read resume data.
// This is true when either the direct DB connection or the API key is available.
func (c *Client) Configured() bool {
	return c.rxDB != nil || (c.baseURL != "" && c.apiKey != "")
}

// APIConfigured returns true if the OpenAPI (x-api-key) is configured for write operations.
func (c *Client) APIConfigured() bool {
	return c.baseURL != "" && c.apiKey != ""
}

// PDFConfigured returns true if PDF export is possible via either the API key or direct Chromium.
func (c *Client) PDFConfigured() bool {
	return c.APIConfigured() || (c.printerHTTPURL != "" && c.printerAppURL != "")
}

// lookupRxUserID finds the RxResume user ID by email in the rxresume database.
func (c *Client) lookupRxUserID(ctx context.Context, email string) (string, error) {
	if c.rxDB == nil {
		return "", fmt.Errorf("rxresume database not configured")
	}
	var userID string
	err := c.rxDB.QueryRow(ctx, `SELECT id FROM "user" WHERE email = $1`, email).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("lookup rxresume user by email: %w", err)
	}
	return userID, nil
}

// ListResumesForUser returns all resumes for a user identified by email,
// querying the rxresume database directly.
func (c *Client) ListResumesForUser(ctx context.Context, email string) ([]Resume, error) {
	if c.rxDB == nil {
		return nil, fmt.Errorf("rxresume database not configured")
	}
	rxUserID, err := c.lookupRxUserID(ctx, email)
	if err != nil {
		return nil, err
	}

	rows, err := c.rxDB.Query(ctx,
		`SELECT id, name, slug, tags, is_public, is_locked, created_at, updated_at
		 FROM resume WHERE user_id = $1 ORDER BY updated_at DESC`, rxUserID)
	if err != nil {
		return nil, fmt.Errorf("rxresume list resumes: %w", err)
	}
	defer rows.Close()

	var resumes []Resume
	for rows.Next() {
		var r Resume
		var tags []string
		var isPublic, isLocked bool
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&r.ID, &r.Name, &r.Slug, &tags, &isPublic, &isLocked, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan resume row: %w", err)
		}
		r.Tags = tags
		if r.Tags == nil {
			r.Tags = []string{}
		}
		r.IsPublic = isPublic
		r.IsLocked = isLocked
		r.CreatedAt = createdAt.Format(time.RFC3339)
		r.UpdatedAt = updatedAt.Format(time.RFC3339)
		resumes = append(resumes, r)
	}
	if resumes == nil {
		resumes = []Resume{}
	}
	return resumes, rows.Err()
}

// GetResumeForUser fetches a single resume with full data from the rxresume database.
func (c *Client) GetResumeForUser(ctx context.Context, email, resumeID string) (*ResumeDetail, error) {
	if c.rxDB == nil {
		return nil, fmt.Errorf("rxresume database not configured")
	}
	rxUserID, err := c.lookupRxUserID(ctx, email)
	if err != nil {
		return nil, err
	}

	var r ResumeDetail
	var tags []string
	var isPublic, isLocked bool
	var createdAt, updatedAt time.Time
	err = c.rxDB.QueryRow(ctx,
		`SELECT id, name, slug, tags, is_public, is_locked, data, created_at, updated_at
		 FROM resume WHERE id = $1 AND user_id = $2`, resumeID, rxUserID).
		Scan(&r.ID, &r.Name, &r.Slug, &tags, &isPublic, &isLocked, &r.Data, &createdAt, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("404: resume not found")
		}
		return nil, fmt.Errorf("rxresume get %s: %w", resumeID, err)
	}
	r.Tags = tags
	if r.Tags == nil {
		r.Tags = []string{}
	}
	r.IsPublic = isPublic
	r.IsLocked = isLocked
	r.CreatedAt = createdAt.Format(time.RFC3339)
	r.UpdatedAt = updatedAt.Format(time.RFC3339)
	return &r, nil
}

// CreateResume creates a new resume via the OpenAPI.
func (c *Client) CreateResume(ctx context.Context, req CreateResumeRequest) (*Resume, error) {
	var resume Resume
	if err := c.do(ctx, http.MethodPost, "/api/openapi/resumes", req, &resume); err != nil {
		return nil, fmt.Errorf("rxresume create: %w", err)
	}
	return &resume, nil
}

// DeleteResume permanently deletes a resume via the OpenAPI.
func (c *Client) DeleteResume(ctx context.Context, id string) error {
	if err := c.do(ctx, http.MethodDelete, "/api/openapi/resumes/"+id, nil, nil); err != nil {
		return fmt.Errorf("rxresume delete %s: %w", id, err)
	}
	return nil
}

// ExportPDF triggers PDF generation and returns the download URL.
func (c *Client) ExportPDF(ctx context.Context, id string) (string, error) {
	var resp PDFResponse
	if err := c.do(ctx, http.MethodGet, "/api/openapi/resumes/"+id+"/pdf", nil, &resp); err != nil {
		return "", fmt.Errorf("rxresume export pdf %s: %w", id, err)
	}
	return resp.URL, nil
}

// ExportPDFDirect generates a PDF by calling Browserless Chromium's HTTP API directly.
// It constructs the RxResume artboard URL and sends it to Chromium for rendering.
func (c *Client) ExportPDFDirect(ctx context.Context, rxResumeID string) ([]byte, error) {
	if c.printerHTTPURL == "" || c.printerAppURL == "" {
		return nil, fmt.Errorf("printer HTTP URL or printer app URL not configured")
	}

	// Use the printer-visible URL (Docker-internal) so the Chromium container can reach RxResume
	artboardURL := c.printerAppURL + "/artboard/resume/" + rxResumeID

	reqBody := map[string]any{
		"url": artboardURL,
		"options": map[string]any{
			"printBackground": true,
			"format":          "A4",
		},
		"gotoOptions": map[string]any{
			"waitUntil": "networkidle0",
			"timeout":   30000,
		},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal printer request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.printerHTTPURL+"/pdf", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create printer request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("printer http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("printer unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	pdfBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read printer response: %w", err)
	}

	return pdfBytes, nil
}

// ConnectDB opens a read-only connection pool to the rxresume database.
// Returns nil pool (no error) if dbURL is empty.
func ConnectDB(ctx context.Context, dbURL string) (*pgxpool.Pool, error) {
	if dbURL == "" {
		slog.Warn("RXRESUME_DATABASE_URL not set — per-user resume sync disabled, falling back to API key")
		return nil, nil
	}
	poolCfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, fmt.Errorf("parse rxresume db url: %w", err)
	}
	poolCfg.MaxConns = 3 // small pool, read-only
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("connect rxresume db: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping rxresume db: %w", err)
	}
	slog.Info("connected to rxresume database for per-user resume sync")
	return pool, nil
}

// do executes an HTTP request against the RxResume OpenAPI.
func (c *Client) do(ctx context.Context, method, path string, body any, result any) error {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("x-api-key", c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(respBody))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}

	return nil
}
