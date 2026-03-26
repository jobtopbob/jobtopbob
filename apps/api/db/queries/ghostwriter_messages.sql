-- name: CreateGhostwriterMessage :one
INSERT INTO ghostwriter_messages (user_id, job_id, role, content)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListGhostwriterMessages :many
SELECT * FROM ghostwriter_messages
WHERE job_id = $1 AND user_id = $2
ORDER BY created_at ASC;

-- name: DeleteGhostwriterMessages :execresult
DELETE FROM ghostwriter_messages WHERE job_id = $1 AND user_id = $2;
