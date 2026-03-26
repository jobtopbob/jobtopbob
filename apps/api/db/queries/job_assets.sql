-- name: CreateJobAsset :one
INSERT INTO job_assets (user_id, job_id, type, content, model_used)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListJobAssets :many
SELECT * FROM job_assets
WHERE job_id = $1 AND user_id = $2
ORDER BY created_at DESC;

-- name: GetJobAsset :one
SELECT * FROM job_assets
WHERE id = $1 AND user_id = $2;

-- name: DeleteJobAsset :execresult
DELETE FROM job_assets WHERE id = $1 AND user_id = $2;
