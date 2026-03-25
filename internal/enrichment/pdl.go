package enrichment

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

// PDL is an enrichment provider backed by the People Data Labs Company API.
type PDL struct {
	APIKey string
	Client *http.Client
}

func (p *PDL) Name() string { return "pdl" }

func (p *PDL) Enrich(ctx context.Context, domain string) (*Result, error) {
	url := fmt.Sprintf("https://api.peopledatalabs.com/v5/company/enrich?website=%s", domain)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("X-Api-Key", p.APIKey)

	resp, err := p.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		slog.Info("PDL returned non-200", "domain", domain, "status", resp.StatusCode)
		return nil, nil // No data, not an error
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var pdl pdlResponse
	if err := json.Unmarshal(body, &pdl); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	result := &Result{
		Description: StrPtr(pdl.Summary),
		Industry:    StrPtr(pdl.Industry),
		Size:        StrPtr(pdl.Size),
		LinkedinURL: StrPtr(pdl.LinkedinURL),
	}

	if pdl.Location != nil && pdl.Location.Name != "" {
		result.Location = &pdl.Location.Name
	}
	if pdl.Founded > 0 {
		result.FoundedYear = Int32Ptr(int32(pdl.Founded))
	}
	if pdl.EmployeeCount > 0 {
		result.EmployeeCount = Int32Ptr(int32(pdl.EmployeeCount))
	}
	if pdl.ProfilePicURL != "" {
		result.LogoURL = &pdl.ProfilePicURL
	}

	return result, nil
}

type pdlResponse struct {
	Name          string   `json:"name"`
	Industry      string   `json:"industry"`
	Size          string   `json:"size"`
	Location      *pdlLoc  `json:"location"`
	Founded       int      `json:"founded"`
	LinkedinURL   string   `json:"linkedin_url"`
	EmployeeCount int      `json:"employee_count"`
	Summary       string   `json:"summary"`
	Tags          []string `json:"tags"`
	ProfilePicURL string   `json:"profile_pic_url"`
}

type pdlLoc struct {
	Name string `json:"name"`
}
