// Package gmail implements the email.Provider interface for Gmail using the Gmail API.
package gmail

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	gm "google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"

	"github.com/jobtopbob/jobtopbob/internal/email"
)

// Config holds the Gmail-specific configuration.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	// Full Pub/Sub topic path: "projects/{project}/topics/{topic}"
	PubSubTopic string
}

// Provider implements email.Provider for Gmail.
type Provider struct {
	oauthCfg    *oauth2.Config
	pubSubTopic string
}

// New creates a new Gmail email provider.
func New(cfg Config) *Provider {
	return &Provider{
		oauthCfg: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			RedirectURL:  cfg.RedirectURI,
			Scopes:       []string{gm.GmailReadonlyScope},
			Endpoint:     google.Endpoint,
		},
		pubSubTopic: cfg.PubSubTopic,
	}
}

func (p *Provider) Name() string { return "gmail" }

func (p *Provider) GetOAuthURL(state string) string {
	return p.oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))
}

func (p *Provider) ExchangeCode(ctx context.Context, code string) (*email.OAuthTokens, error) {
	token, err := p.oauthCfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	// Fetch the user's email address
	emailAddr, err := p.fetchEmailAddress(ctx, token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("fetch email: %w", err)
	}

	return &email.OAuthTokens{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		Scope:        strings.Join(p.oauthCfg.Scopes, " "),
		ExpiresAt:    token.Expiry,
		Email:        emailAddr,
	}, nil
}

func (p *Provider) RefreshToken(ctx context.Context, refreshToken string) (*email.OAuthTokens, error) {
	ts := p.oauthCfg.TokenSource(ctx, &oauth2.Token{RefreshToken: refreshToken})
	token, err := ts.Token()
	if err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}

	return &email.OAuthTokens{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
		ExpiresAt:    token.Expiry,
	}, nil
}

func (p *Provider) RevokeToken(ctx context.Context, accessToken string) error {
	resp, err := http.Post("https://oauth2.googleapis.com/revoke?token="+accessToken, "application/x-www-form-urlencoded", nil)
	if err != nil {
		return fmt.Errorf("revoke: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("revoke failed (status %d): %s", resp.StatusCode, string(body))
	}
	return nil
}

func (p *Provider) Watch(ctx context.Context, accessToken string) (*email.WatchResult, error) {
	svc, err := p.gmailService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	resp, err := svc.Users.Watch("me", &gm.WatchRequest{
		TopicName:           p.pubSubTopic,
		LabelIds:            []string{"INBOX"},
		LabelFilterBehavior: "include",
	}).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("watch: %w", err)
	}

	return &email.WatchResult{
		HistoryID:  fmt.Sprintf("%d", resp.HistoryId),
		Expiration: time.UnixMilli(resp.Expiration),
	}, nil
}

func (p *Provider) Unwatch(ctx context.Context, accessToken string) error {
	svc, err := p.gmailService(ctx, accessToken)
	if err != nil {
		return err
	}

	return svc.Users.Stop("me").Context(ctx).Do()
}

func (p *Provider) FetchNewEmails(ctx context.Context, accessToken string, historyCursor string) ([]email.RawEmail, string, error) {
	svc, err := p.gmailService(ctx, accessToken)
	if err != nil {
		return nil, "", err
	}

	var emails []email.RawEmail
	var latestHistoryID string

	if historyCursor == "" {
		// Initial sync: fetch last 7 days
		return p.initialFetch(ctx, svc)
	}

	// Incremental fetch using history.list
	histResp, err := svc.Users.History.List("me").
		StartHistoryId(parseHistoryID(historyCursor)).
		HistoryTypes("messageAdded").
		LabelId("INBOX").
		Context(ctx).Do()
	if err != nil {
		// If history ID is too old, fall back to initial fetch
		if isHistoryExpired(err) {
			return p.initialFetch(ctx, svc)
		}
		return nil, "", fmt.Errorf("history.list: %w", err)
	}

	latestHistoryID = fmt.Sprintf("%d", histResp.HistoryId)

	// Collect unique message IDs from history
	seen := make(map[string]bool)
	for _, h := range histResp.History {
		for _, ma := range h.MessagesAdded {
			if !seen[ma.Message.Id] {
				seen[ma.Message.Id] = true
			}
		}
	}

	// Fetch full messages
	for msgID := range seen {
		rawEmail, err := p.fetchMessage(ctx, svc, msgID)
		if err != nil {
			continue // Skip individual message failures
		}
		emails = append(emails, *rawEmail)
	}

	return emails, latestHistoryID, nil
}

// initialFetch retrieves messages from the last 7 days for first-time setup.
func (p *Provider) initialFetch(ctx context.Context, svc *gm.Service) ([]email.RawEmail, string, error) {
	sevenDaysAgo := time.Now().Add(-7 * 24 * time.Hour).Unix()
	query := fmt.Sprintf("after:%d", sevenDaysAgo)

	listResp, err := svc.Users.Messages.List("me").
		Q(query).
		LabelIds("INBOX").
		MaxResults(50).
		Context(ctx).Do()
	if err != nil {
		return nil, "", fmt.Errorf("messages.list: %w", err)
	}

	var emails []email.RawEmail
	for _, msg := range listResp.Messages {
		rawEmail, err := p.fetchMessage(ctx, svc, msg.Id)
		if err != nil {
			continue
		}
		emails = append(emails, *rawEmail)
	}

	// Get current history ID for future incremental fetches
	profile, err := svc.Users.GetProfile("me").Context(ctx).Do()
	if err != nil {
		return emails, "", fmt.Errorf("get profile: %w", err)
	}

	return emails, fmt.Sprintf("%d", profile.HistoryId), nil
}

// fetchMessage retrieves a single message and converts it to a RawEmail.
func (p *Provider) fetchMessage(ctx context.Context, svc *gm.Service, messageID string) (*email.RawEmail, error) {
	msg, err := svc.Users.Messages.Get("me", messageID).
		Format("full").
		Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("messages.get: %w", err)
	}

	subject, from, date := extractHeaders(msg.Payload)
	body := extractBody(msg.Payload)

	// Truncate body to 10,000 chars for AI cost control
	if len(body) > 10000 {
		body = body[:10000]
	}

	parsedDate, _ := time.Parse(time.RFC1123Z, date)

	return &email.RawEmail{
		MessageID: messageID,
		Subject:   subject,
		From:      from,
		Date:      parsedDate,
		Body:      body,
	}, nil
}

// fetchEmailAddress retrieves the authenticated user's email address.
func (p *Provider) fetchEmailAddress(ctx context.Context, accessToken string) (string, error) {
	svc, err := p.gmailService(ctx, accessToken)
	if err != nil {
		return "", err
	}

	profile, err := svc.Users.GetProfile("me").Context(ctx).Do()
	if err != nil {
		return "", fmt.Errorf("get profile: %w", err)
	}

	return profile.EmailAddress, nil
}

func (p *Provider) gmailService(ctx context.Context, accessToken string) (*gm.Service, error) {
	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: accessToken})
	svc, err := gm.NewService(ctx, option.WithTokenSource(ts))
	if err != nil {
		return nil, fmt.Errorf("create gmail service: %w", err)
	}
	return svc, nil
}

func extractHeaders(payload *gm.MessagePart) (subject, from, date string) {
	for _, h := range payload.Headers {
		switch strings.ToLower(h.Name) {
		case "subject":
			subject = h.Value
		case "from":
			from = h.Value
		case "date":
			date = h.Value
		}
	}
	return
}

func extractBody(payload *gm.MessagePart) string {
	// Try to get plain text body directly
	if payload.MimeType == "text/plain" && payload.Body != nil && payload.Body.Data != "" {
		decoded, err := base64.URLEncoding.DecodeString(payload.Body.Data)
		if err == nil {
			return string(decoded)
		}
	}

	// Search through parts for text/plain first, then text/html
	var htmlBody string
	for _, part := range payload.Parts {
		if part.MimeType == "text/plain" && part.Body != nil && part.Body.Data != "" {
			decoded, err := base64.URLEncoding.DecodeString(part.Body.Data)
			if err == nil {
				return string(decoded)
			}
		}
		if part.MimeType == "text/html" && part.Body != nil && part.Body.Data != "" {
			decoded, err := base64.URLEncoding.DecodeString(part.Body.Data)
			if err == nil {
				htmlBody = stripHTMLTags(string(decoded))
			}
		}
		// Recurse into nested multipart
		if len(part.Parts) > 0 {
			if body := extractBody(part); body != "" {
				return body
			}
		}
	}

	return htmlBody
}

// stripHTMLTags removes HTML tags from a string (basic implementation).
func stripHTMLTags(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func parseHistoryID(s string) uint64 {
	var id uint64
	fmt.Sscanf(s, "%d", &id)
	return id
}

func isHistoryExpired(err error) bool {
	return strings.Contains(err.Error(), "historyId is too old") ||
		strings.Contains(err.Error(), "404")
}
