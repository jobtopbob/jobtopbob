-- name: ListScrapeRuns :many
SELECT sr.*,
       sp.name AS search_profile_name
FROM scrape_runs sr
LEFT JOIN search_profiles sp ON sp.id = sr.search_profile_id
WHERE sr.user_id = $1
ORDER BY sr.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountScrapeRuns :one
SELECT count(*) FROM scrape_runs WHERE user_id = $1;

-- name: GetScrapeRun :one
SELECT sr.*,
       sp.name AS search_profile_name
FROM scrape_runs sr
LEFT JOIN search_profiles sp ON sp.id = sr.search_profile_id
WHERE sr.id = $1 AND sr.user_id = $2;

-- name: CreateScrapeRun :one
INSERT INTO scrape_runs (
    user_id, search_profile_id, status, sources, keywords, location, country, language, parent_run_id, started_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateScrapeRunStatus :exec
UPDATE scrape_runs SET
    status = $2,
    error_message = $3,
    completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN now() ELSE completed_at END
WHERE id = $1;

-- name: IncrementScrapeRunCounts :exec
UPDATE scrape_runs SET
    jobs_found = COALESCE(jobs_found, 0) + $2,
    jobs_new = COALESCE(jobs_new, 0) + $3
WHERE id = $1;

-- name: UpdateScrapeRunNextPageToken :exec
UPDATE scrape_runs SET next_page_token = $2 WHERE id = $1;
