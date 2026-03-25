// Package email defines the interface for email provider integrations.
// Implementations (Gmail, Outlook, etc.) live in sub-packages.
package email

import (
	"context"
	"time"
)

// RawEmail represents an email fetched from any provider.
type RawEmail struct {
	// Provider-specific message ID (e.g., Gmail message ID, Outlook message ID)
	MessageID string
	Subject   string
	From      string
	Date      time.Time
	Body      string // Plain text body (HTML stripped if necessary)
}

// OAuthTokens holds the tokens returned by an OAuth exchange or refresh.
type OAuthTokens struct {
	AccessToken  string
	RefreshToken string
	TokenType    string
	Scope        string
	ExpiresAt    time.Time
	Email        string // The email address of the connected account
}

// WatchResult holds the result of setting up push notifications.
type WatchResult struct {
	// Provider-specific history/sync cursor for incremental fetches.
	HistoryID string
	// When the watch expires and must be renewed.
	Expiration time.Time
}

// Provider defines the interface that all email integrations must implement.
// Each provider (Gmail, Outlook, etc.) implements this to enable plug-and-play integration.
type Provider interface {
	// Name returns the provider identifier (e.g., "gmail", "outlook").
	Name() string

	// GetOAuthURL returns the URL to redirect the user to for OAuth consent.
	// The state parameter is an opaque string for CSRF protection.
	GetOAuthURL(state string) string

	// ExchangeCode exchanges an authorization code for OAuth tokens.
	ExchangeCode(ctx context.Context, code string) (*OAuthTokens, error)

	// RefreshToken refreshes an expired access token using the refresh token.
	RefreshToken(ctx context.Context, refreshToken string) (*OAuthTokens, error)

	// RevokeToken revokes the user's access token with the provider.
	RevokeToken(ctx context.Context, accessToken string) error

	// Watch sets up push notifications for new emails (e.g., Gmail Pub/Sub, Outlook subscriptions).
	// Returns a history/sync cursor for incremental fetching.
	Watch(ctx context.Context, accessToken string) (*WatchResult, error)

	// Unwatch removes push notification subscription for the user.
	Unwatch(ctx context.Context, accessToken string) error

	// FetchNewEmails retrieves emails that arrived since the given history cursor.
	// If historyCursor is empty, fetches emails from the last 7 days.
	// Returns the new emails and an updated history cursor.
	FetchNewEmails(ctx context.Context, accessToken string, historyCursor string) ([]RawEmail, string, error)
}
