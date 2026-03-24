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

-- name: UpdateUserImage :exec
UPDATE "user"
SET image = $2, "updatedAt" = now()
WHERE id = $1;

-- name: GetUserImage :one
SELECT image FROM "user"
WHERE id = $1;

-- name: GetUserSettings :one
SELECT user_id, ai_provider, ai_model, writing_style, weekly_goal, task_models, created_at, updated_at
FROM user_settings
WHERE user_id = $1;

-- name: UpsertUserSettings :one
INSERT INTO user_settings (user_id, ai_provider, ai_model, writing_style, weekly_goal)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id)
DO UPDATE SET
  ai_provider = COALESCE($2, user_settings.ai_provider),
  ai_model = COALESCE($3, user_settings.ai_model),
  writing_style = COALESCE($4, user_settings.writing_style),
  weekly_goal = COALESCE($5, user_settings.weekly_goal)
RETURNING user_id, ai_provider, ai_model, writing_style, weekly_goal, task_models, created_at, updated_at;
