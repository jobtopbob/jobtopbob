-- name: CreateActivityLog :one
INSERT INTO activity_log (user_id, entity_type, entity_id, action, old_value, new_value)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListActivityByEntity :many
SELECT * FROM activity_log
WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
ORDER BY created_at DESC;
