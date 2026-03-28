-- name: CreateEmailEvent :one
INSERT INTO email_events (user_id, job_id, gmail_message_id, detected_type, confidence, confirmed, raw_snippet, company_name, from_email)
VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8)
RETURNING *;

-- name: GetEmailEventByMessageID :one
SELECT * FROM email_events
WHERE user_id = $1 AND gmail_message_id = $2;

-- name: ListUnconfirmedEmailEvents :many
SELECT e.*,
       j.title AS job_title,
       c.name AS job_company_name,
       j.stage_id AS job_stage_id,
       s.name AS job_stage_name
FROM email_events e
LEFT JOIN jobs j ON j.id = e.job_id
LEFT JOIN companies c ON c.id = j.company_id
LEFT JOIN stages s ON s.id = j.stage_id
WHERE e.user_id = $1 AND (e.confirmed IS NULL OR e.confirmed = false)
ORDER BY e.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountUnconfirmedEmailEvents :one
SELECT count(*) FROM email_events
WHERE user_id = $1 AND (confirmed IS NULL OR confirmed = false);

-- name: ListEmailEvents :many
SELECT e.*,
       j.title AS job_title,
       c.name AS job_company_name,
       j.stage_id AS job_stage_id,
       s.name AS job_stage_name
FROM email_events e
LEFT JOIN jobs j ON j.id = e.job_id
LEFT JOIN companies c ON c.id = j.company_id
LEFT JOIN stages s ON s.id = j.stage_id
WHERE e.user_id = $1
ORDER BY e.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountEmailEvents :one
SELECT count(*) FROM email_events
WHERE user_id = $1;

-- name: GetEmailEvent :one
SELECT * FROM email_events
WHERE id = $1 AND user_id = $2;

-- name: ConfirmEmailEvent :one
UPDATE email_events SET confirmed = true
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: DismissEmailEvent :one
UPDATE email_events SET confirmed = false
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: UpdateEmailEventJobID :exec
UPDATE email_events SET job_id = $2
WHERE id = $1 AND user_id = $3;

-- name: DeleteEmailEventsByUser :exec
DELETE FROM email_events
WHERE user_id = $1;
