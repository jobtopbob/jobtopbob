CREATE TABLE job_assets (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    type        text,
    content     text,
    storage_key text,
    model_used  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON job_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
