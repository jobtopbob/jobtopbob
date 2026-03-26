CREATE TABLE scrape_runs (
    id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    search_profile_id  uuid,  -- FK added in 000027 after search_profiles table is created
    status             text,
    sources            text[],
    keywords           text[],
    location           text,
    country            text,
    jobs_found         int,
    jobs_new           int,
    error_message      text,
    started_at         timestamptz,
    completed_at       timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON scrape_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
