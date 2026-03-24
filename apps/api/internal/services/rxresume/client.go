// Package rxresume provides a client for Reactive Resume v5.
// All communication happens via RxResume's OpenAPI using per-user API keys.
package rxresume

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client communicates with a Reactive Resume v5 instance.
type Client struct {
	baseURL        string
	publicURL      string // Public URL of the resume builder (for URL rewriting in Docker)
	printerHTTPURL string // Browserless Chromium HTTP endpoint for direct PDF generation
	printerAppURL  string // URL the printer uses to reach the resume builder (Docker-internal)
	httpClient     *http.Client
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
// publicURL is the browser-facing URL of the resume builder (used to rewrite PDF download URLs).
// printerHTTPURL is the Browserless Chromium HTTP endpoint for direct PDF generation.
func NewClient(baseURL, publicURL, printerHTTPURL, printerAppURL string) *Client {
	return &Client{
		baseURL:        strings.TrimRight(baseURL, "/"),
		publicURL:      strings.TrimRight(publicURL, "/"),
		printerHTTPURL: strings.TrimRight(printerHTTPURL, "/"),
		printerAppURL:  strings.TrimRight(printerAppURL, "/"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// BuilderConfigured returns true if the resume builder URL is set.
func (c *Client) BuilderConfigured() bool {
	return c.baseURL != ""
}

// PDFConfigured returns true if PDF export is possible via direct Chromium.
func (c *Client) PDFConfigured() bool {
	return c.printerHTTPURL != "" && c.printerAppURL != ""
}

// ValidateAPIKey checks if an API key is valid by calling the list endpoint.
func (c *Client) ValidateAPIKey(ctx context.Context, apiKey string) error {
	var resumes []Resume
	return c.doWithKey(ctx, apiKey, http.MethodGet, "/api/openapi/resumes", nil, &resumes)
}

// ListResumes returns all resumes for the user identified by apiKey.
func (c *Client) ListResumes(ctx context.Context, apiKey string) ([]Resume, error) {
	var resumes []Resume
	if err := c.doWithKey(ctx, apiKey, http.MethodGet, "/api/openapi/resumes", nil, &resumes); err != nil {
		return nil, fmt.Errorf("rxresume list: %w", err)
	}
	if resumes == nil {
		resumes = []Resume{}
	}
	return resumes, nil
}

// GetResume fetches a single resume with full data via the OpenAPI.
func (c *Client) GetResume(ctx context.Context, apiKey, id string) (*ResumeDetail, error) {
	var detail ResumeDetail
	if err := c.doWithKey(ctx, apiKey, http.MethodGet, "/api/openapi/resumes/"+id, nil, &detail); err != nil {
		return nil, fmt.Errorf("rxresume get %s: %w", id, err)
	}
	return &detail, nil
}

// CreateResume creates a new resume via the OpenAPI.
func (c *Client) CreateResume(ctx context.Context, apiKey string, req CreateResumeRequest) (*Resume, error) {
	var resume Resume
	if err := c.doWithKey(ctx, apiKey, http.MethodPost, "/api/openapi/resumes", req, &resume); err != nil {
		return nil, fmt.Errorf("rxresume create: %w", err)
	}
	return &resume, nil
}

// DeleteResume permanently deletes a resume via the OpenAPI.
func (c *Client) DeleteResume(ctx context.Context, apiKey, id string) error {
	if err := c.doWithKey(ctx, apiKey, http.MethodDelete, "/api/openapi/resumes/"+id, nil, nil); err != nil {
		return fmt.Errorf("rxresume delete %s: %w", id, err)
	}
	return nil
}

// ExportPDF triggers PDF generation and returns the download URL.
// The returned URL is rewritten from the public URL to the internal base URL
// so the Go API can fetch it from inside Docker.
func (c *Client) ExportPDF(ctx context.Context, apiKey, id string) (string, error) {
	var resp PDFResponse
	if err := c.doWithKey(ctx, apiKey, http.MethodGet, "/api/openapi/resumes/"+id+"/pdf", nil, &resp); err != nil {
		return "", fmt.Errorf("rxresume export pdf %s: %w", id, err)
	}
	return c.rewriteURL(resp.URL), nil
}

// rewriteURL replaces the public URL prefix with the internal base URL
// so the Go API can reach the resume builder from inside Docker.
func (c *Client) rewriteURL(u string) string {
	if c.publicURL != "" && c.baseURL != "" && c.publicURL != c.baseURL {
		if strings.HasPrefix(u, c.publicURL) {
			return c.baseURL + strings.TrimPrefix(u, c.publicURL)
		}
	}
	return u
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

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.printerHTTPURL+"/chromium/pdf", bytes.NewReader(body))
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

// doWithKey executes an HTTP request against the RxResume OpenAPI with a per-user API key.
func (c *Client) doWithKey(ctx context.Context, apiKey, method, path string, body any, result any) error {
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

	req.Header.Set("x-api-key", apiKey)
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
