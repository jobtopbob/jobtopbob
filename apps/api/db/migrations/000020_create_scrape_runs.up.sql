CREATE TABLE scrape_runs (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status       text,
    sources      text[],
    jobs_found   int,
    jobs_new     int,
    started_at   timestamptz,
    completed_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON scrape_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
