-- name: CreateResumeVersion :one
INSERT INTO resume_versions (user_id, resume_id, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetResumeVersion :one
SELECT * FROM resume_versions
WHERE id = $1 AND user_id = $2;

-- name: ListResumeVersionsByResume :many
SELECT * FROM resume_versions
WHERE resume_id = $1 AND user_id = $2
ORDER BY created_at DESC;

-- name: DeleteResumeVersion :execrows
DELETE FROM resume_versions
WHERE id = $1 AND user_id = $2;
