-- name: GetOAuthToken :one
SELECT * FROM oauth_tokens
WHERE user_id = $1 AND provider = $2;

-- name: UpsertOAuthToken :one
INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, token_type, scope, expires_at, synced_email)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (user_id, provider)
DO UPDATE SET
    access_token = $3,
    refresh_token = COALESCE(NULLIF($4, ''), oauth_tokens.refresh_token),
    token_type = $5,
    scope = $6,
    expires_at = $7,
    synced_email = COALESCE(NULLIF($8, ''), oauth_tokens.synced_email)
RETURNING *;

-- name: DeleteOAuthToken :exec
DELETE FROM oauth_tokens
WHERE user_id = $1 AND provider = $2;

-- name: ListUsersWithGmail :many
SELECT DISTINCT user_id FROM oauth_tokens
WHERE provider = 'gmail';

-- name: UpdateOAuthHistoryID :exec
UPDATE oauth_tokens
SET gmail_history_id = $3, last_synced_at = now()
WHERE user_id = $1 AND provider = $2;

-- name: GetOAuthTokenByEmail :one
SELECT * FROM oauth_tokens
WHERE synced_email = $1 AND provider = 'gmail';
