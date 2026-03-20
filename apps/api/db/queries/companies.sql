-- name: ListCompanies :many
SELECT * FROM companies WHERE user_id = $1 ORDER BY name ASC;

-- name: GetCompany :one
SELECT * FROM companies WHERE id = $1 AND user_id = $2;

-- name: CreateCompany :one
INSERT INTO companies (user_id, name, website, industry, size, interest, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateCompany :one
UPDATE companies SET
    name = COALESCE(sqlc.narg('name'), name),
    website = COALESCE(sqlc.narg('website'), website),
    industry = COALESCE(sqlc.narg('industry'), industry),
    size = COALESCE(sqlc.narg('size'), size),
    interest = COALESCE(sqlc.narg('interest'), interest),
    notes = COALESCE(sqlc.narg('notes'), notes)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DeleteCompany :execresult
DELETE FROM companies WHERE id = $1 AND user_id = $2;

-- name: FindCompanyByName :one
SELECT * FROM companies WHERE user_id = $1 AND name = $2 LIMIT 1;
