-- name: GetJob :one
SELECT j.*,
       c.name AS company_name,
       c.logo_url AS company_logo_url,
       s.name AS stage_name
FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
LEFT JOIN stages s ON s.id = j.stage_id
WHERE j.id = $1 AND j.user_id = $2;

-- name: ListJobs :many
SELECT j.*,
       c.name AS company_name,
       c.logo_url AS company_logo_url,
       s.name AS stage_name
FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
LEFT JOIN stages s ON s.id = j.stage_id
WHERE j.user_id = $1
  AND (sqlc.narg('statuses')::text[] IS NULL OR j.status = ANY(sqlc.narg('statuses')::text[]))
  AND (sqlc.narg('stage_ids')::uuid[] IS NULL OR j.stage_id = ANY(sqlc.narg('stage_ids')::uuid[]))
  AND (sqlc.narg('location_types')::text[] IS NULL OR j.location_type = ANY(sqlc.narg('location_types')::text[]))
  AND (sqlc.narg('sources')::text[] IS NULL OR j.source = ANY(sqlc.narg('sources')::text[]))
  AND (sqlc.narg('job_types')::text[] IS NULL OR j.job_type = ANY(sqlc.narg('job_types')::text[]))
  AND (sqlc.narg('job_levels')::text[] IS NULL OR j.job_level = ANY(sqlc.narg('job_levels')::text[]))
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('created_after')::timestamptz IS NULL OR j.created_at >= sqlc.narg('created_after'))
  AND (sqlc.narg('created_before')::timestamptz IS NULL OR j.created_at <= sqlc.narg('created_before'))
  AND (sqlc.narg('tag_ids')::uuid[] IS NULL OR EXISTS (
      SELECT 1 FROM taggings t
      WHERE t.entity_type = 'job' AND t.entity_id = j.id AND t.tag_id = ANY(sqlc.narg('tag_ids')::uuid[])
  ))
ORDER BY
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'asc' THEN j.title END ASC,
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'desc' THEN j.title END DESC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'asc' THEN j.updated_at END ASC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'desc' THEN j.updated_at END DESC,
  CASE WHEN @sort_by::text = 'applied_at' AND @sort_order::text = 'asc' THEN j.applied_at END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'applied_at' AND @sort_order::text = 'desc' THEN j.applied_at END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'salary_min' AND @sort_order::text = 'asc' THEN j.salary_min END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'salary_min' AND @sort_order::text = 'desc' THEN j.salary_min END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'asc' THEN j.deadline END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'desc' THEN j.deadline END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN j.created_at END ASC,
  j.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountJobs :one
SELECT count(*) FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
WHERE j.user_id = $1
  AND (sqlc.narg('statuses')::text[] IS NULL OR j.status = ANY(sqlc.narg('statuses')::text[]))
  AND (sqlc.narg('stage_ids')::uuid[] IS NULL OR j.stage_id = ANY(sqlc.narg('stage_ids')::uuid[]))
  AND (sqlc.narg('location_types')::text[] IS NULL OR j.location_type = ANY(sqlc.narg('location_types')::text[]))
  AND (sqlc.narg('sources')::text[] IS NULL OR j.source = ANY(sqlc.narg('sources')::text[]))
  AND (sqlc.narg('job_types')::text[] IS NULL OR j.job_type = ANY(sqlc.narg('job_types')::text[]))
  AND (sqlc.narg('job_levels')::text[] IS NULL OR j.job_level = ANY(sqlc.narg('job_levels')::text[]))
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('created_after')::timestamptz IS NULL OR j.created_at >= sqlc.narg('created_after'))
  AND (sqlc.narg('created_before')::timestamptz IS NULL OR j.created_at <= sqlc.narg('created_before'))
  AND (sqlc.narg('tag_ids')::uuid[] IS NULL OR EXISTS (
      SELECT 1 FROM taggings t
      WHERE t.entity_type = 'job' AND t.entity_id = j.id AND t.tag_id = ANY(sqlc.narg('tag_ids')::uuid[])
  ));

-- name: CreateJob :one
INSERT INTO jobs (
    user_id, company_id, stage_id, title, status, source, source_url,
    location, location_type, salary_min, salary_max, salary_currency,
    interest, jd_raw, applied_at, follow_up_at,
    deadline, job_type, job_level, salary_interval, application_url,
    experience_range, skills
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
    $17, $18, $19, $20, $21, $22, $23
) RETURNING *;

-- name: UpdateJob :one
UPDATE jobs SET
    company_id = COALESCE(sqlc.narg('company_id'), company_id),
    stage_id = COALESCE(sqlc.narg('stage_id'), stage_id),
    title = COALESCE(sqlc.narg('title'), title),
    status = COALESCE(sqlc.narg('status'), status),
    close_reason = COALESCE(sqlc.narg('close_reason'), close_reason),
    source = COALESCE(sqlc.narg('source'), source),
    source_url = COALESCE(sqlc.narg('source_url'), source_url),
    location = COALESCE(sqlc.narg('location'), location),
    location_type = COALESCE(sqlc.narg('location_type'), location_type),
    salary_min = COALESCE(sqlc.narg('salary_min'), salary_min),
    salary_max = COALESCE(sqlc.narg('salary_max'), salary_max),
    salary_market = COALESCE(sqlc.narg('salary_market'), salary_market),
    salary_currency = COALESCE(sqlc.narg('salary_currency'), salary_currency),
    interest = COALESCE(sqlc.narg('interest'), interest),
    suitability = COALESCE(sqlc.narg('suitability'), suitability),
    suitability_reason = COALESCE(sqlc.narg('suitability_reason'), suitability_reason),
    resume_version_id = COALESCE(sqlc.narg('resume_version_id'), resume_version_id),
    jd_raw = COALESCE(sqlc.narg('jd_raw'), jd_raw),
    applied_at = COALESCE(sqlc.narg('applied_at'), applied_at),
    follow_up_at = COALESCE(sqlc.narg('follow_up_at'), follow_up_at),
    deadline = COALESCE(sqlc.narg('deadline'), deadline),
    job_type = COALESCE(sqlc.narg('job_type'), job_type),
    job_level = COALESCE(sqlc.narg('job_level'), job_level),
    salary_interval = COALESCE(sqlc.narg('salary_interval'), salary_interval),
    application_url = COALESCE(sqlc.narg('application_url'), application_url),
    experience_range = COALESCE(sqlc.narg('experience_range'), experience_range),
    skills = COALESCE(sqlc.narg('skills'), skills),
    closed_at = COALESCE(sqlc.narg('closed_at'), closed_at)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteJob :execresult
DELETE FROM jobs WHERE id = $1 AND user_id = $2;

-- name: BulkUpdateJobStage :execresult
UPDATE jobs SET stage_id = $1 WHERE id = ANY($2::uuid[]) AND user_id = $3;

-- name: BulkUpdateJobStatus :execresult
UPDATE jobs SET status = $1 WHERE id = ANY($2::uuid[]) AND user_id = $3;

-- name: BulkDeleteJobs :execresult
DELETE FROM jobs WHERE id = ANY($1::uuid[]) AND user_id = $2;

-- name: CountJobsByStatus :many
SELECT COALESCE(status, 'unset') AS status, count(*) AS count
FROM jobs
WHERE user_id = $1
GROUP BY status;

-- name: CountFollowUpsDue :one
SELECT count(*) FROM jobs
WHERE user_id = $1 AND follow_up_at <= now() AND status NOT IN ('closed', 'rejected', 'accepted');

-- name: ClearJobCompany :exec
UPDATE jobs SET company_id = NULL WHERE id = $1 AND user_id = $2;

-- name: FindMostRecentJobByCompany :one
SELECT id FROM jobs
WHERE user_id = $1 AND company_id = $2 AND status NOT IN ('closed', 'rejected', 'accepted')
ORDER BY created_at DESC
LIMIT 1;

-- name: CreateScrapedJob :one
INSERT INTO jobs (
    user_id, title, source, source_url, location, location_type,
    salary_min, salary_max, salary_currency, salary_interval,
    jd_raw, job_type, job_level, application_url, skills,
    status, dedup_hash, scrape_run_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
    'discovered', $16, $17
) ON CONFLICT (user_id, dedup_hash) WHERE dedup_hash IS NOT NULL DO NOTHING
RETURNING *;

-- name: ListDiscoveredJobs :many
SELECT j.*,
       c.name AS company_name,
       c.logo_url AS company_logo_url,
       s.name AS stage_name
FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
LEFT JOIN stages s ON s.id = j.stage_id
WHERE j.user_id = $1 AND j.status = 'discovered'
  AND (sqlc.narg('scrape_run_id')::uuid IS NULL OR j.scrape_run_id = sqlc.narg('scrape_run_id')::uuid)
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ))
ORDER BY j.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountDiscoveredJobs :one
SELECT count(*) FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
WHERE j.user_id = $1 AND j.status = 'discovered'
  AND (sqlc.narg('scrape_run_id')::uuid IS NULL OR j.scrape_run_id = sqlc.narg('scrape_run_id')::uuid)
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ));
