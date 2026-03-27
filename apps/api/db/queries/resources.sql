-- name: ListResources :many
SELECT * FROM resources
WHERE user_id = $1
  AND (sqlc.narg('types')::text[] IS NULL OR type = ANY(sqlc.narg('types')::text[]))
  AND (sqlc.narg('categories')::text[] IS NULL OR category = ANY(sqlc.narg('categories')::text[]))
  AND (sqlc.narg('search')::text IS NULL OR (
      title ILIKE '%' || sqlc.narg('search') || '%'
      OR description ILIKE '%' || sqlc.narg('search') || '%'
      OR url ILIKE '%' || sqlc.narg('search') || '%'
  ))
ORDER BY
  pinned DESC,
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'asc' THEN title END ASC,
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'desc' THEN title END DESC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'asc' THEN updated_at END ASC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'desc' THEN updated_at END DESC,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN created_at END ASC,
  created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountResources :one
SELECT count(*) FROM resources
WHERE user_id = $1
  AND (sqlc.narg('types')::text[] IS NULL OR type = ANY(sqlc.narg('types')::text[]))
  AND (sqlc.narg('categories')::text[] IS NULL OR category = ANY(sqlc.narg('categories')::text[]))
  AND (sqlc.narg('search')::text IS NULL OR (
      title ILIKE '%' || sqlc.narg('search') || '%'
      OR description ILIKE '%' || sqlc.narg('search') || '%'
      OR url ILIKE '%' || sqlc.narg('search') || '%'
  ));

-- name: GetResource :one
SELECT * FROM resources WHERE id = $1 AND user_id = $2;

-- name: CreateResource :one
INSERT INTO resources (
    user_id, title, url, type, category, description, content, pinned
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: UpdateResource :one
UPDATE resources SET
    title = COALESCE(sqlc.narg('title'), title),
    url = COALESCE(sqlc.narg('url'), url),
    type = COALESCE(sqlc.narg('type'), type),
    category = COALESCE(sqlc.narg('category'), category),
    description = COALESCE(sqlc.narg('description'), description),
    content = COALESCE(sqlc.narg('content'), content),
    pinned = COALESCE(sqlc.narg('pinned'), pinned)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteResource :execresult
DELETE FROM resources WHERE id = $1 AND user_id = $2;

-- name: ToggleResourcePin :one
UPDATE resources SET pinned = NOT pinned
WHERE id = $1 AND user_id = $2
RETURNING *;
