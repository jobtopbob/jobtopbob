-- name: ListContacts :many
SELECT ct.*,
       c.name AS company_name,
       c.logo_url AS company_logo_url
FROM contacts ct
LEFT JOIN companies c ON c.id = ct.company_id
WHERE ct.user_id = $1
  AND (sqlc.narg('statuses')::text[] IS NULL OR ct.status = ANY(sqlc.narg('statuses')::text[]))
  AND (sqlc.narg('sources')::text[] IS NULL OR ct.source = ANY(sqlc.narg('sources')::text[]))
  AND (sqlc.narg('company_id')::uuid IS NULL OR ct.company_id = sqlc.narg('company_id')::uuid)
  AND (sqlc.narg('search')::text IS NULL OR (
      ct.name ILIKE '%' || sqlc.narg('search') || '%'
      OR ct.email ILIKE '%' || sqlc.narg('search') || '%'
      OR ct.role ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
  ))
ORDER BY
  CASE WHEN @sort_by::text = 'name' AND @sort_order::text = 'asc' THEN ct.name END ASC,
  CASE WHEN @sort_by::text = 'name' AND @sort_order::text = 'desc' THEN ct.name END DESC,
  CASE WHEN @sort_by::text = 'last_contact' AND @sort_order::text = 'asc' THEN ct.last_contact END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'last_contact' AND @sort_order::text = 'desc' THEN ct.last_contact END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'asc' THEN ct.updated_at END ASC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'desc' THEN ct.updated_at END DESC,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN ct.created_at END ASC,
  ct.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountContacts :one
SELECT count(*) FROM contacts ct
LEFT JOIN companies c ON c.id = ct.company_id
WHERE ct.user_id = $1
  AND (sqlc.narg('statuses')::text[] IS NULL OR ct.status = ANY(sqlc.narg('statuses')::text[]))
  AND (sqlc.narg('sources')::text[] IS NULL OR ct.source = ANY(sqlc.narg('sources')::text[]))
  AND (sqlc.narg('company_id')::uuid IS NULL OR ct.company_id = sqlc.narg('company_id')::uuid)
  AND (sqlc.narg('search')::text IS NULL OR (
      ct.name ILIKE '%' || sqlc.narg('search') || '%'
      OR ct.email ILIKE '%' || sqlc.narg('search') || '%'
      OR ct.role ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
  ));

-- name: GetContact :one
SELECT ct.*,
       c.name AS company_name,
       c.logo_url AS company_logo_url
FROM contacts ct
LEFT JOIN companies c ON c.id = ct.company_id
WHERE ct.id = $1 AND ct.user_id = $2;

-- name: CreateContact :one
INSERT INTO contacts (
    user_id, company_id, name, role, email,
    linkedin_url, source, status, notes, last_contact
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateContact :one
UPDATE contacts SET
    company_id = COALESCE(sqlc.narg('company_id'), company_id),
    name = COALESCE(sqlc.narg('name'), name),
    role = COALESCE(sqlc.narg('role'), role),
    email = COALESCE(sqlc.narg('email'), email),
    linkedin_url = COALESCE(sqlc.narg('linkedin_url'), linkedin_url),
    avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
    source = COALESCE(sqlc.narg('source'), source),
    status = COALESCE(sqlc.narg('status'), status),
    notes = COALESCE(sqlc.narg('notes'), notes),
    last_contact = COALESCE(sqlc.narg('last_contact'), last_contact)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateContactCompanyID :exec
UPDATE contacts SET company_id = sqlc.narg('company_id')
WHERE id = $1 AND user_id = $2;

-- name: UpdateContactAvatarURL :one
UPDATE contacts SET avatar_url = sqlc.narg('avatar_url')
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteContact :execresult
DELETE FROM contacts WHERE id = $1 AND user_id = $2;

-- name: SearchContacts :many
SELECT ct.*, c.name AS company_name
FROM contacts ct
LEFT JOIN companies c ON c.id = ct.company_id
WHERE ct.user_id = $1
  AND (ct.name ILIKE '%' || $2 || '%' OR ct.email ILIKE '%' || $2 || '%')
ORDER BY ct.name ASC
LIMIT 20;

-- name: ListContactsByCompany :many
SELECT ct.*, c.name AS company_name
FROM contacts ct
LEFT JOIN companies c ON c.id = ct.company_id
WHERE ct.user_id = $1 AND ct.company_id = $2
ORDER BY ct.name ASC;
