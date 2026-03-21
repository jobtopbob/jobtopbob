CREATE TABLE ghostwriter_messages (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    job_id     uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    role       text,
    content    text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON ghostwriter_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
