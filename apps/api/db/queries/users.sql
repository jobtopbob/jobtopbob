-- name: GetUser :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (id, email, name, avatar_url) VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET
    email = COALESCE(sqlc.narg('email'), email),
    name = COALESCE(sqlc.narg('name'), name),
    avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url)
WHERE id = $1
RETURNING *;
