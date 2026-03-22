// Package rxresume provides an HTTP client for the Reactive Resume v5 OpenAPI.
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
	baseURL    string
	apiKey     string
	httpClient *http.Client
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

// NewClient creates a new RxResume API client.
func NewClient(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Configured returns true if the client has a base URL and API key set.
func (c *Client) Configured() bool {
	return c.baseURL != "" && c.apiKey != ""
}

// ListResumes returns all resumes for the authenticated user.
func (c *Client) ListResumes(ctx context.Context) ([]Resume, error) {
	var resumes []Resume
	if err := c.do(ctx, http.MethodGet, "/api/openapi/resumes", nil, &resumes); err != nil {
		return nil, fmt.Errorf("rxresume list: %w", err)
	}
	return resumes, nil
}

// CreateResume creates a new resume.
func (c *Client) CreateResume(ctx context.Context, req CreateResumeRequest) (*Resume, error) {
	var resume Resume
	if err := c.do(ctx, http.MethodPost, "/api/openapi/resumes", req, &resume); err != nil {
		return nil, fmt.Errorf("rxresume create: %w", err)
	}
	return &resume, nil
}

// GetResume fetches a single resume with full data.
func (c *Client) GetResume(ctx context.Context, id string) (*ResumeDetail, error) {
	var resume ResumeDetail
	if err := c.do(ctx, http.MethodGet, "/api/openapi/resumes/"+id, nil, &resume); err != nil {
		return nil, fmt.Errorf("rxresume get %s: %w", id, err)
	}
	return &resume, nil
}

// DeleteResume permanently deletes a resume.
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

// do executes an HTTP request against the RxResume API.
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
