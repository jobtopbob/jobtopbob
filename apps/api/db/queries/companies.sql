-- name: ListCompanies :many
SELECT * FROM companies WHERE user_id = $1 ORDER BY name ASC;

-- name: ListCompaniesWithJobCount :many
SELECT c.*,
       count(j.id)::int AS job_count
FROM companies c
LEFT JOIN jobs j ON j.company_id = c.id
WHERE c.user_id = $1
GROUP BY c.id
ORDER BY c.name ASC;

-- name: GetCompany :one
SELECT * FROM companies WHERE id = $1 AND user_id = $2;

-- name: GetCompanyWithJobCount :one
SELECT c.*,
       count(j.id)::int AS job_count
FROM companies c
LEFT JOIN jobs j ON j.company_id = c.id
WHERE c.id = $1 AND c.user_id = $2
GROUP BY c.id;

-- name: CreateCompany :one
INSERT INTO companies (
    user_id, name, domain, website, description, industry, size,
    location, founded_year, linkedin_url, employee_count,
    interest, notes, logo_url, data_source, enrichment_status
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11,
    $12, $13, $14,
    COALESCE(sqlc.narg('data_source'), 'manual'),
    COALESCE(sqlc.narg('enrichment_status'), 'none')
)
RETURNING *;

-- name: UpdateCompany :one
UPDATE companies SET
    name = COALESCE(sqlc.narg('name'), name),
    domain = COALESCE(sqlc.narg('domain'), domain),
    website = COALESCE(sqlc.narg('website'), website),
    description = COALESCE(sqlc.narg('description'), description),
    industry = COALESCE(sqlc.narg('industry'), industry),
    size = COALESCE(sqlc.narg('size'), size),
    location = COALESCE(sqlc.narg('location'), location),
    founded_year = COALESCE(sqlc.narg('founded_year'), founded_year),
    linkedin_url = COALESCE(sqlc.narg('linkedin_url'), linkedin_url),
    employee_count = COALESCE(sqlc.narg('employee_count'), employee_count),
    interest = COALESCE(sqlc.narg('interest'), interest),
    notes = COALESCE(sqlc.narg('notes'), notes),
    logo_url = COALESCE(sqlc.narg('logo_url'), logo_url)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateCompanyEnrichment :one
UPDATE companies SET
    description = COALESCE(sqlc.narg('description'), description),
    industry = COALESCE(sqlc.narg('industry'), industry),
    size = COALESCE(sqlc.narg('size'), size),
    location = COALESCE(sqlc.narg('location'), location),
    founded_year = COALESCE(sqlc.narg('founded_year'), founded_year),
    linkedin_url = COALESCE(sqlc.narg('linkedin_url'), linkedin_url),
    employee_count = COALESCE(sqlc.narg('employee_count'), employee_count),
    logo_url = COALESCE(sqlc.narg('logo_url'), logo_url),
    domain = COALESCE(sqlc.narg('domain'), domain),
    data_source = COALESCE(sqlc.narg('data_source'), data_source),
    enrichment_status = $3,
    last_enriched_at = now()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteCompany :execresult
DELETE FROM companies WHERE id = $1 AND user_id = $2;

-- name: FindCompanyByName :one
SELECT * FROM companies WHERE user_id = $1 AND name = $2 LIMIT 1;

-- name: FindCompanyByDomain :one
SELECT * FROM companies WHERE user_id = $1 AND domain = $2 LIMIT 1;

-- name: FindCompanyByNameFuzzy :many
SELECT * FROM companies WHERE user_id = $1 AND lower(name) = lower($2);

-- name: SearchCompanies :many
SELECT * FROM companies
WHERE user_id = $1
  AND (name ILIKE '%' || $2 || '%' OR domain ILIKE '%' || $2 || '%')
ORDER BY name ASC
LIMIT 20;

-- name: ListCompaniesNeedingEnrichment :many
SELECT * FROM companies
WHERE user_id = $1 AND enrichment_status IN ('none', 'failed')
ORDER BY created_at DESC
LIMIT $2;

-- name: CountCompaniesByUser :one
SELECT count(*) FROM companies WHERE user_id = $1;
