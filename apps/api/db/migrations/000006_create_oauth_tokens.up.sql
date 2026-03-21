CREATE TABLE oauth_tokens (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider      text NOT NULL,
    access_token  text,
    refresh_token text,
    token_type    text,
    scope         text,
    expires_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
