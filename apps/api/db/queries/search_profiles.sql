-- name: ListSearchProfiles :many
SELECT sp.*,
       (SELECT count(*) FROM scrape_runs sr WHERE sr.search_profile_id = sp.id)::int AS run_count,
       (SELECT max(sr.completed_at) FROM scrape_runs sr WHERE sr.search_profile_id = sp.id) AS last_completed_at
FROM search_profiles sp
WHERE sp.user_id = $1
ORDER BY sp.updated_at DESC
LIMIT $2 OFFSET $3;

-- name: CountSearchProfiles :one
SELECT count(*) FROM search_profiles WHERE user_id = $1;

-- name: GetSearchProfile :one
SELECT * FROM search_profiles WHERE id = $1 AND user_id = $2;

-- name: CreateSearchProfile :one
INSERT INTO search_profiles (
    user_id, name, source, resume_id, keywords, location, country,
    job_type, experience_level, remote_only, salary_min, salary_max,
    skills, target_roles
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
) RETURNING *;

-- name: UpdateSearchProfile :one
UPDATE search_profiles SET
    name = COALESCE(sqlc.narg('name'), name),
    keywords = COALESCE(sqlc.narg('keywords'), keywords),
    location = COALESCE(sqlc.narg('location'), location),
    country = COALESCE(sqlc.narg('country'), country),
    job_type = COALESCE(sqlc.narg('job_type'), job_type),
    experience_level = COALESCE(sqlc.narg('experience_level'), experience_level),
    remote_only = COALESCE(sqlc.narg('remote_only'), remote_only),
    salary_min = COALESCE(sqlc.narg('salary_min'), salary_min),
    salary_max = COALESCE(sqlc.narg('salary_max'), salary_max),
    skills = COALESCE(sqlc.narg('skills'), skills),
    target_roles = COALESCE(sqlc.narg('target_roles'), target_roles),
    is_active = COALESCE(sqlc.narg('is_active'), is_active)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateSearchProfileLastRun :exec
UPDATE search_profiles SET last_run_at = now() WHERE id = $1;

-- name: DeleteSearchProfile :execresult
DELETE FROM search_profiles WHERE id = $1 AND user_id = $2;
