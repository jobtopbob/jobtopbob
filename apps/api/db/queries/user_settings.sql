-- name: GetRxResumeAPIKey :one
SELECT rxresume_api_key FROM user_settings
WHERE user_id = $1;

-- name: SetRxResumeAPIKey :exec
INSERT INTO user_settings (user_id, rxresume_api_key)
VALUES ($1, $2)
ON CONFLICT (user_id)
DO UPDATE SET rxresume_api_key = $2;

-- name: ClearRxResumeAPIKey :exec
UPDATE user_settings
SET rxresume_api_key = NULL
WHERE user_id = $1;
