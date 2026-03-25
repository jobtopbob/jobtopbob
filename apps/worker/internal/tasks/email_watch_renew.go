package tasks

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/email"
)

// WatchRenewDeps holds dependencies for the watch renewal task.
type WatchRenewDeps struct {
	Pool          *pgxpool.Pool
	MasterKey     []byte
	EmailProvider email.Provider
}

// HandleWatchRenew returns an Asynq handler for the email:watch-renew cron task.
// This renews the Gmail push notification watch for all connected users.
// Gmail watches expire after 7 days; this runs every 6 days.
func HandleWatchRenew(deps *WatchRenewDeps) func(ctx context.Context, t *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		q := db.New(deps.Pool)

		users, err := q.ListUsersWithGmail(ctx)
		if err != nil {
			return fmt.Errorf("list users: %w", err)
		}

		slog.Info("renewing gmail watches", "user_count", len(users))

		for _, userID := range users {
			if err := renewWatch(ctx, deps, q, userID); err != nil {
				slog.Error("failed to renew watch", "user_id", userID, "error", err)
				continue // Don't fail the entire cron for one user
			}
		}

		return nil
	}
}

func renewWatch(ctx context.Context, deps *WatchRenewDeps, q *db.Queries, userID string) error {
	tokenRow, err := q.GetOAuthToken(ctx, db.GetOAuthTokenParams{
		UserID:   userID,
		Provider: deps.EmailProvider.Name(),
	})
	if err != nil {
		return fmt.Errorf("get token: %w", err)
	}

	accessToken, refreshToken, _, err := decryptTokens(deps.MasterKey, userID, tokenRow)
	if err != nil {
		return fmt.Errorf("decrypt: %w", err)
	}

	// Refresh token if expired
	if tokenRow.ExpiresAt.Valid && tokenRow.ExpiresAt.Time.Before(time.Now()) {
		refreshed, err := deps.EmailProvider.RefreshToken(ctx, refreshToken)
		if err != nil {
			return fmt.Errorf("refresh: %w", err)
		}
		accessToken = refreshed.AccessToken
	}

	// Renew the watch
	result, err := deps.EmailProvider.Watch(ctx, accessToken)
	if err != nil {
		return fmt.Errorf("watch: %w", err)
	}

	// Update history ID if newer
	_ = q.UpdateOAuthHistoryID(ctx, db.UpdateOAuthHistoryIDParams{
		UserID:         userID,
		Provider:       deps.EmailProvider.Name(),
		GmailHistoryID: pgtype.Text{String: result.HistoryID, Valid: true},
	})

	slog.Info("renewed gmail watch", "user_id", userID, "expires", result.Expiration)
	return nil
}
