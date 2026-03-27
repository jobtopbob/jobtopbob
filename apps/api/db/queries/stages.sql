-- name: ListStages :many
SELECT * FROM stages WHERE user_id = $1 ORDER BY position ASC;

-- name: GetStage :one
SELECT * FROM stages WHERE id = $1 AND user_id = $2;

-- name: CreateStage :one
INSERT INTO stages (user_id, name, position, is_terminal, color, mapped_status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateStage :one
UPDATE stages SET
    name = COALESCE(sqlc.narg('name'), name),
    is_terminal = COALESCE(sqlc.narg('is_terminal'), is_terminal),
    color = COALESCE(sqlc.narg('color'), color),
    mapped_status = COALESCE(sqlc.narg('mapped_status'), mapped_status)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteStage :execresult
DELETE FROM stages WHERE id = $1 AND user_id = $2;

-- name: UpdateStagePosition :exec
UPDATE stages SET position = $1 WHERE id = $2 AND user_id = $3;

-- name: SeedDefaultStages :exec
INSERT INTO stages (user_id, name, position, is_terminal, color, mapped_status) VALUES
    ($1, 'Yet to Apply', 0, false, '#6B7280', 'open'),
    ($1, 'Applied',     1, false, '#3B82F6', 'open'),
    ($1, 'Screening',   2, false, '#8B5CF6', 'open'),
    ($1, 'Interviewing',3, false, '#F59E0B', 'open'),
    ($1, 'Offer',       4, false, '#10B981', 'offer'),
    ($1, 'Accepted',    5, true,  '#059669', 'accepted'),
    ($1, 'Rejected',    6, true,  '#EF4444', 'rejected'),
    ($1, 'Withdrawn',   7, true,  '#9CA3AF', 'closed');

-- name: GetStageByMappedStatus :one
SELECT * FROM stages WHERE user_id = $1 AND mapped_status = $2 LIMIT 1;
