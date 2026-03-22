-- name: CreateResume :one
INSERT INTO resumes (user_id, name, rxresume_id, is_base)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetResume :one
SELECT * FROM resumes
WHERE id = $1 AND user_id = $2;

-- name: ListResumes :many
SELECT * FROM resumes
WHERE user_id = $1
ORDER BY updated_at DESC;

-- name: UpdateResume :one
UPDATE resumes
SET name        = COALESCE(sqlc.narg('name'), name),
    is_base     = COALESCE(sqlc.narg('is_base'), is_base),
    rxresume_id = COALESCE(sqlc.narg('rxresume_id'), rxresume_id)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteResume :execrows
DELETE FROM resumes
WHERE id = $1 AND user_id = $2;

-- name: CountResumes :one
SELECT count(*) FROM resumes
WHERE user_id = $1;

-- name: GetBaseResume :one
SELECT * FROM resumes
WHERE user_id = $1 AND is_base = true
LIMIT 1;

-- name: ClearBaseResume :exec
UPDATE resumes
SET is_base = false
WHERE user_id = $1 AND is_base = true;
