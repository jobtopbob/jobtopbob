package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/crypto"
	"github.com/jobtopbob/jobtopbob/internal/email"
)

// statePayload is the JWT-like signed payload used in OAuth state parameter.
type statePayload struct {
	UserID    string `json:"uid"`
	ExpiresAt int64  `json:"exp"`
}

// GenerateOAuthState creates a signed state token containing the user ID.
func GenerateOAuthState(masterKey []byte, userID string) (string, error) {
	payload := statePayload{
		UserID:    userID,
		ExpiresAt: time.Now().Add(10 * time.Minute).Unix(),
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	mac := hmac.New(sha256.New, masterKey)
	mac.Write(data)
	sig := mac.Sum(nil)

	// Encode as base64url: payload.signature
	return base64.URLEncoding.EncodeToString(data) + "." + base64.URLEncoding.EncodeToString(sig), nil
}

// ValidateOAuthState verifies and extracts the user ID from a signed state token.
func ValidateOAuthState(masterKey []byte, state string) (string, error) {
	parts := splitOAuthState(state)
	if len(parts) != 2 {
		return "", errors.New("invalid state format")
	}

	data, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("decode payload: %w", err)
	}

	sig, err := base64.URLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("decode signature: %w", err)
	}

	mac := hmac.New(sha256.New, masterKey)
	mac.Write(data)
	if !hmac.Equal(sig, mac.Sum(nil)) {
		return "", errors.New("invalid state signature")
	}

	var payload statePayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return "", fmt.Errorf("unmarshal payload: %w", err)
	}

	if time.Now().Unix() > payload.ExpiresAt {
		return "", errors.New("state expired")
	}

	return payload.UserID, nil
}

func splitOAuthState(s string) []string {
	for i := len(s) - 1; i >= 0; i-- {
		if s[i] == '.' {
			return []string{s[:i], s[i+1:]}
		}
	}
	return []string{s}
}

// StoreOAuthTokens encrypts and stores OAuth tokens for a user.
func StoreOAuthTokens(ctx context.Context, q *db.Queries, masterKey []byte, userID string, provider email.Provider, tokens *email.OAuthTokens) error {
	encAccess, err := crypto.Encrypt(masterKey, userID, tokens.AccessToken)
	if err != nil {
		return fmt.Errorf("encrypt access token: %w", err)
	}

	encRefresh := ""
	if tokens.RefreshToken != "" {
		encRefresh, err = crypto.Encrypt(masterKey, userID, tokens.RefreshToken)
		if err != nil {
			return fmt.Errorf("encrypt refresh token: %w", err)
		}
	}

	_, err = q.UpsertOAuthToken(ctx, db.UpsertOAuthTokenParams{
		UserID:       userID,
		Provider:     provider.Name(),
		AccessToken:  pgtype.Text{String: encAccess, Valid: true},
		RefreshToken: pgtype.Text{String: encRefresh, Valid: encRefresh != ""},
		TokenType:    pgtype.Text{String: tokens.TokenType, Valid: tokens.TokenType != ""},
		Scope:        pgtype.Text{String: tokens.Scope, Valid: tokens.Scope != ""},
		ExpiresAt:    pgtype.Timestamptz{Time: tokens.ExpiresAt, Valid: !tokens.ExpiresAt.IsZero()},
		SyncedEmail:  pgtype.Text{String: tokens.Email, Valid: tokens.Email != ""},
	})
	return err
}

// GetDecryptedTokens retrieves and decrypts OAuth tokens for a user.
func GetDecryptedTokens(ctx context.Context, q *db.Queries, masterKey []byte, userID string, providerName string) (accessToken, refreshToken string, expiresAt time.Time, err error) {
	row, err := q.GetOAuthToken(ctx, db.GetOAuthTokenParams{
		UserID:   userID,
		Provider: providerName,
	})
	if err != nil {
		return "", "", time.Time{}, fmt.Errorf("get token: %w", err)
	}

	if row.AccessToken.Valid {
		accessToken, err = crypto.Decrypt(masterKey, userID, row.AccessToken.String)
		if err != nil {
			return "", "", time.Time{}, fmt.Errorf("decrypt access token: %w", err)
		}
	}

	if row.RefreshToken.Valid {
		refreshToken, err = crypto.Decrypt(masterKey, userID, row.RefreshToken.String)
		if err != nil {
			return "", "", time.Time{}, fmt.Errorf("decrypt refresh token: %w", err)
		}
	}

	if row.ExpiresAt.Valid {
		expiresAt = row.ExpiresAt.Time
	}

	return accessToken, refreshToken, expiresAt, nil
}

// GetConnectionStatus returns whether an email provider is connected for a user.
func GetConnectionStatus(ctx context.Context, q *db.Queries, userID string, providerName string) (connected bool, emailAddr string, err error) {
	row, err := q.GetOAuthToken(ctx, db.GetOAuthTokenParams{
		UserID:   userID,
		Provider: providerName,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, "", nil
		}
		return false, "", err
	}

	return true, row.SyncedEmail.String, nil
}

// RevokeAndDeleteTokens revokes access with the provider and deletes all data.
func RevokeAndDeleteTokens(ctx context.Context, q *db.Queries, masterKey []byte, userID string, provider email.Provider) error {
	accessToken, _, _, err := GetDecryptedTokens(ctx, q, masterKey, userID, provider.Name())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // Already disconnected
		}
		return fmt.Errorf("get tokens: %w", err)
	}

	// Unwatch push notifications
	if accessToken != "" {
		_ = provider.Unwatch(ctx, accessToken)
		_ = provider.RevokeToken(ctx, accessToken)
	}

	// Delete OAuth tokens
	if err := q.DeleteOAuthToken(ctx, db.DeleteOAuthTokenParams{
		UserID:   userID,
		Provider: provider.Name(),
	}); err != nil {
		return fmt.Errorf("delete token: %w", err)
	}

	// Delete all email events for this user
	if err := q.DeleteEmailEventsByUser(ctx, userID); err != nil {
		return fmt.Errorf("delete events: %w", err)
	}

	return nil
}
