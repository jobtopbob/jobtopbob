-- name: CreateResume :one
INSERT INTO resumes (user_id, name, rxresume_id, is_base, template)
VALUES ($1, $2, $3, $4, $5)
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

-- name: UpdateResumeSnapshot :exec
UPDATE resumes
SET template         = $3,
    headline         = $4,
    full_name        = $5,
    email            = $6,
    picture_url      = $7,
    latest_role      = $8,
    primary_color    = $9,
    experience_count = $10,
    education_count  = $11,
    skills_count     = $12,
    projects_count   = $13,
    certs_count      = $14,
    top_skills       = $15,
    synced_at        = now()
WHERE id = $1 AND user_id = $2;

-- name: ListStaleResumes :many
SELECT * FROM resumes
WHERE user_id = $1
  AND rxresume_id IS NOT NULL
  AND (synced_at IS NULL OR synced_at < now() - interval '5 minutes')
ORDER BY updated_at DESC;

-- name: ClearResumeSync :exec
UPDATE resumes
SET rxresume_id      = NULL,
    template         = NULL,
    headline         = NULL,
    full_name        = NULL,
    email            = NULL,
    picture_url      = NULL,
    latest_role      = NULL,
    primary_color    = NULL,
    experience_count = 0,
    education_count  = 0,
    skills_count     = 0,
    projects_count   = 0,
    certs_count      = 0,
    top_skills       = NULL,
    synced_at        = NULL
WHERE id = $1 AND user_id = $2;
