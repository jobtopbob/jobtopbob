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
  AND (sqlc.narg('status')::text IS NULL OR j.status = sqlc.narg('status'))
  AND (sqlc.narg('stage_id')::uuid IS NULL OR j.stage_id = sqlc.narg('stage_id'))
  AND (sqlc.narg('location_type')::text IS NULL OR j.location_type = sqlc.narg('location_type'))
  AND (sqlc.narg('source')::text IS NULL OR j.source = sqlc.narg('source'))
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('created_after')::timestamptz IS NULL OR j.created_at >= sqlc.narg('created_after'))
  AND (sqlc.narg('created_before')::timestamptz IS NULL OR j.created_at <= sqlc.narg('created_before'))
  AND (sqlc.narg('tag_id')::uuid IS NULL OR EXISTS (
      SELECT 1 FROM taggings t
      WHERE t.entity_type = 'job' AND t.entity_id = j.id AND t.tag_id = sqlc.narg('tag_id')
  ))
ORDER BY
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'asc' THEN j.title END ASC,
  CASE WHEN @sort_by::text = 'title' AND @sort_order::text = 'desc' THEN j.title END DESC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'asc' THEN j.updated_at END ASC,
  CASE WHEN @sort_by::text = 'updated_at' AND @sort_order::text = 'desc' THEN j.updated_at END DESC,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN j.created_at END ASC,
  j.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountJobs :one
SELECT count(*) FROM jobs j
LEFT JOIN companies c ON c.id = j.company_id
WHERE j.user_id = $1
  AND (sqlc.narg('status')::text IS NULL OR j.status = sqlc.narg('status'))
  AND (sqlc.narg('stage_id')::uuid IS NULL OR j.stage_id = sqlc.narg('stage_id'))
  AND (sqlc.narg('location_type')::text IS NULL OR j.location_type = sqlc.narg('location_type'))
  AND (sqlc.narg('source')::text IS NULL OR j.source = sqlc.narg('source'))
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR j.location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('created_after')::timestamptz IS NULL OR j.created_at >= sqlc.narg('created_after'))
  AND (sqlc.narg('created_before')::timestamptz IS NULL OR j.created_at <= sqlc.narg('created_before'))
  AND (sqlc.narg('tag_id')::uuid IS NULL OR EXISTS (
      SELECT 1 FROM taggings t
      WHERE t.entity_type = 'job' AND t.entity_id = j.id AND t.tag_id = sqlc.narg('tag_id')
  ));

-- name: CreateJob :one
INSERT INTO jobs (
    user_id, company_id, stage_id, title, status, source, source_url,
    location, location_type, salary_min, salary_max, salary_currency,
    interest, jd_raw, applied_at, follow_up_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
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
    follow_up_at = COALESCE(sqlc.narg('follow_up_at'), follow_up_at)
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
