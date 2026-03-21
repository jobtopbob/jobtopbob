CREATE TABLE resumes (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name        text NOT NULL,
    rxresume_id text,
    is_base     boolean,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
