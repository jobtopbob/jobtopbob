-- name: ListOffers :many
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.user_id = $1
ORDER BY
  CASE WHEN @sort_by::text = 'base_salary' AND @sort_order::text = 'asc' THEN o.base_salary END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'base_salary' AND @sort_order::text = 'desc' THEN o.base_salary END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'asc' THEN o.deadline END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'desc' THEN o.deadline END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN o.created_at END ASC,
  o.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountOffers :one
SELECT count(*) FROM offers WHERE user_id = $1;

-- name: GetOffer :one
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.id = $1 AND o.user_id = $2;

-- name: GetOfferByJobID :one
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.job_id = $1 AND o.user_id = $2;

-- name: CreateOffer :one
INSERT INTO offers (
    user_id, job_id, base_salary, currency, equity,
    bonus, benefits, deadline, accepted, negotiation_log
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;

-- name: UpdateOffer :one
UPDATE offers SET
    base_salary = COALESCE(sqlc.narg('base_salary'), base_salary),
    currency = COALESCE(sqlc.narg('currency'), currency),
    equity = COALESCE(sqlc.narg('equity'), equity),
    bonus = COALESCE(sqlc.narg('bonus'), bonus),
    benefits = COALESCE(sqlc.narg('benefits'), benefits),
    deadline = COALESCE(sqlc.narg('deadline'), deadline),
    accepted = COALESCE(sqlc.narg('accepted'), accepted),
    negotiation_log = COALESCE(sqlc.narg('negotiation_log'), negotiation_log)
WHERE id = $1 AND user_id = $2
RETURNING *;
