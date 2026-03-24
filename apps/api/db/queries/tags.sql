-- name: ListTags :many
SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC;

-- name: GetTag :one
SELECT * FROM tags WHERE id = $1 AND user_id = $2;

-- name: CreateTag :one
INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *;

-- name: DeleteTag :execresult
DELETE FROM tags WHERE id = $1 AND user_id = $2;

-- name: CreateTagging :exec
INSERT INTO taggings (user_id, tag_id, entity_type, entity_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT DO NOTHING;

-- name: DeleteTagging :execresult
DELETE FROM taggings
WHERE user_id = $1 AND tag_id = $2 AND entity_type = $3 AND entity_id = $4;

-- name: ListTagsForEntity :many
SELECT t.* FROM tags t
JOIN taggings tg ON tg.tag_id = t.id
WHERE tg.user_id = $1 AND tg.entity_type = $2 AND tg.entity_id = $3
ORDER BY t.name ASC;

-- name: ListTagsForEntities :many
SELECT tg.entity_id, t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
FROM tags t
JOIN taggings tg ON tg.tag_id = t.id
WHERE tg.user_id = $1 AND tg.entity_type = $2 AND tg.entity_id = ANY($3::uuid[])
ORDER BY t.name ASC;
