CREATE TABLE webhooks (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    url        text,
    events     text[],
    secret     text,
    active     boolean,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
