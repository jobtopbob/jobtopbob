-- name: ListOffers :many
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name,
       c.logo_url AS company_logo_url
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.user_id = $1
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR o.work_location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('status')::text IS NULL
      OR (sqlc.narg('status')::text = 'accepted' AND o.accepted = true)
      OR (sqlc.narg('status')::text = 'declined' AND o.accepted = false)
      OR (sqlc.narg('status')::text = 'pending' AND o.accepted IS NULL)
  )
  AND (sqlc.narg('remote_policy')::text IS NULL OR o.remote_policy = sqlc.narg('remote_policy'))
ORDER BY
  CASE WHEN @sort_by::text = 'base_salary' AND @sort_order::text = 'asc' THEN o.base_salary END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'base_salary' AND @sort_order::text = 'desc' THEN o.base_salary END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'asc' THEN o.deadline END ASC NULLS LAST,
  CASE WHEN @sort_by::text = 'deadline' AND @sort_order::text = 'desc' THEN o.deadline END DESC NULLS LAST,
  CASE WHEN @sort_by::text = 'created_at' AND @sort_order::text = 'asc' THEN o.created_at END ASC,
  o.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountOffers :one
SELECT count(*)
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.user_id = $1
  AND (sqlc.narg('search')::text IS NULL OR (
      j.title ILIKE '%' || sqlc.narg('search') || '%'
      OR c.name ILIKE '%' || sqlc.narg('search') || '%'
      OR o.work_location ILIKE '%' || sqlc.narg('search') || '%'
  ))
  AND (sqlc.narg('status')::text IS NULL
      OR (sqlc.narg('status')::text = 'accepted' AND o.accepted = true)
      OR (sqlc.narg('status')::text = 'declined' AND o.accepted = false)
      OR (sqlc.narg('status')::text = 'pending' AND o.accepted IS NULL)
  )
  AND (sqlc.narg('remote_policy')::text IS NULL OR o.remote_policy = sqlc.narg('remote_policy'));

-- name: GetOffer :one
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name,
       c.logo_url AS company_logo_url
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.id = $1 AND o.user_id = $2;

-- name: GetOfferByJobID :one
SELECT o.*,
       j.title AS job_title,
       c.name AS company_name,
       c.logo_url AS company_logo_url
FROM offers o
LEFT JOIN jobs j ON j.id = o.job_id
LEFT JOIN companies c ON c.id = j.company_id
WHERE o.job_id = $1 AND o.user_id = $2;

-- name: CreateOffer :one
INSERT INTO offers (
    user_id, job_id, base_salary, currency, salary_interval,
    sign_on_bonus, annual_bonus, equity, equity_value, equity_schedule,
    bonus, benefits, pto_days, remote_policy, retirement_match,
    relocation, work_location, deadline, accepted, negotiation_log
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
) RETURNING *;

-- name: UpdateOffer :one
UPDATE offers SET
    base_salary = COALESCE(sqlc.narg('base_salary'), base_salary),
    currency = COALESCE(sqlc.narg('currency'), currency),
    salary_interval = COALESCE(sqlc.narg('salary_interval'), salary_interval),
    sign_on_bonus = COALESCE(sqlc.narg('sign_on_bonus'), sign_on_bonus),
    annual_bonus = COALESCE(sqlc.narg('annual_bonus'), annual_bonus),
    equity = COALESCE(sqlc.narg('equity'), equity),
    equity_value = COALESCE(sqlc.narg('equity_value'), equity_value),
    equity_schedule = COALESCE(sqlc.narg('equity_schedule'), equity_schedule),
    bonus = COALESCE(sqlc.narg('bonus'), bonus),
    benefits = COALESCE(sqlc.narg('benefits'), benefits),
    pto_days = COALESCE(sqlc.narg('pto_days'), pto_days),
    remote_policy = COALESCE(sqlc.narg('remote_policy'), remote_policy),
    retirement_match = COALESCE(sqlc.narg('retirement_match'), retirement_match),
    relocation = COALESCE(sqlc.narg('relocation'), relocation),
    work_location = COALESCE(sqlc.narg('work_location'), work_location),
    deadline = COALESCE(sqlc.narg('deadline'), deadline),
    accepted = COALESCE(sqlc.narg('accepted'), accepted),
    negotiation_log = COALESCE(sqlc.narg('negotiation_log'), negotiation_log)
WHERE id = $1 AND user_id = $2
RETURNING *;
