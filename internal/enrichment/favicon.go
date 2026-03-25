package enrichment

import (
	"context"
	"fmt"
	"net/http"
)

// Favicon is a simple enrichment provider that returns a logo URL
// from the Google Favicon API. It requires no API key.
type Favicon struct {
	Client *http.Client
}

func (f *Favicon) Name() string { return "favicon" }

func (f *Favicon) Enrich(ctx context.Context, domain string) (*Result, error) {
	url := fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", domain)

	// Verify the favicon exists with a HEAD request
	req, err := http.NewRequestWithContext(ctx, "HEAD", url, nil)
	if err != nil {
		return nil, nil
	}

	resp, err := f.Client.Do(req)
	if err != nil {
		return nil, nil
	}
	resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, nil
	}

	return &Result{LogoURL: &url}, nil
}
