package enrichment

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/jobtopbob/jobtopbob/internal/ai"
	"github.com/jobtopbob/jobtopbob/internal/ai/prompts"
)

// WebScrape is an enrichment provider that fetches a company's website
// and uses an AI model to extract structured data from the page content.
type WebScrape struct {
	AIProvider ai.Provider
	Client     *http.Client
}

func (w *WebScrape) Name() string { return "webscrape" }

func (w *WebScrape) Enrich(ctx context.Context, domain string) (*Result, error) {
	// Fetch homepage, fall back to /about
	pageContent := fetchPageText(ctx, w.Client, "https://"+domain)
	if pageContent == "" {
		pageContent = fetchPageText(ctx, w.Client, "https://"+domain+"/about")
	}
	if pageContent == "" {
		return nil, nil // No content, not an error
	}

	// Truncate to 8000 chars for AI cost control
	if len(pageContent) > 8000 {
		pageContent = pageContent[:8000]
	}

	promptTemplate, err := prompts.Get("company_extract")
	if err != nil {
		return nil, fmt.Errorf("load prompt: %w", err)
	}

	prompt := strings.ReplaceAll(promptTemplate, "{{.Content}}", pageContent)

	aiResult, err := w.AIProvider.Complete(ctx, ai.CompletionRequest{
		UserPrompt:  prompt,
		MaxTokens:   500,
		Temperature: 0.1,
	})
	if err != nil {
		return nil, fmt.Errorf("ai extraction: %w", err)
	}

	var extracted struct {
		Description   string `json:"description"`
		Industry      string `json:"industry"`
		Size          string `json:"size"`
		Location      string `json:"location"`
		FoundedYear   *int32 `json:"founded_year"`
		EmployeeCount *int32 `json:"employee_count"`
		LinkedinURL   string `json:"linkedin_url"`
		LogoURL       string `json:"logo_url"`
	}
	if err := json.Unmarshal([]byte(aiResult), &extracted); err != nil {
		slog.Warn("AI extraction parse failed", "domain", domain, "response", aiResult)
		return nil, nil
	}

	return &Result{
		Description:   StrPtr(extracted.Description),
		Industry:      StrPtr(extracted.Industry),
		Size:          StrPtr(extracted.Size),
		Location:      StrPtr(extracted.Location),
		FoundedYear:   extracted.FoundedYear,
		EmployeeCount: extracted.EmployeeCount,
		LinkedinURL:   StrPtr(extracted.LinkedinURL),
		LogoURL:       StrPtr(extracted.LogoURL),
	}, nil
}

// fetchPageText fetches a URL and returns a simplified text representation.
func fetchPageText(ctx context.Context, client *http.Client, url string) string {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; JobTopBob/1.0)")
	req.Header.Set("Accept", "text/html")

	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return ""
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		return ""
	}

	return stripHTML(string(body))
}

// stripHTML removes HTML tags and excess whitespace to extract readable text.
func stripHTML(html string) string {
	// Remove script and style blocks
	for _, tag := range []string{"script", "style", "noscript"} {
		for {
			start := strings.Index(strings.ToLower(html), "<"+tag)
			if start == -1 {
				break
			}
			end := strings.Index(strings.ToLower(html[start:]), "</"+tag+">")
			if end == -1 {
				html = html[:start]
				break
			}
			html = html[:start] + html[start+end+len("</"+tag+">"):]
		}
	}

	var b strings.Builder
	inTag := false
	for _, r := range html {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
			b.WriteRune(' ')
		case !inTag:
			b.WriteRune(r)
		}
	}

	text := b.String()
	fields := strings.Fields(text)
	return strings.Join(fields, " ")
}
