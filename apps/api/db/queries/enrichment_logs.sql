-- name: CreateEnrichmentLog :one
INSERT INTO enrichment_logs (company_id, user_id, provider, status, fields_set, error, raw_response)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListEnrichmentLogs :many
SELECT * FROM enrichment_logs
WHERE company_id = $1 AND user_id = $2
ORDER BY created_at DESC;

-- name: GetLatestEnrichmentLog :one
SELECT * FROM enrichment_logs
WHERE company_id = $1 AND user_id = $2 AND provider = $3
ORDER BY created_at DESC
LIMIT 1;

-- name: ListEnrichedProviders :many
SELECT DISTINCT provider FROM enrichment_logs
WHERE company_id = $1 AND user_id = $2 AND status = 'success';

-- name: DeleteEnrichmentLogsByCompany :execresult
DELETE FROM enrichment_logs WHERE company_id = $1 AND user_id = $2;
