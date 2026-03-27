CREATE TABLE jobs (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    company_id        uuid REFERENCES companies(id) ON DELETE SET NULL,
    stage_id          uuid REFERENCES stages(id) ON DELETE SET NULL,
    title             text NOT NULL,
    status            text,
    close_reason      text,
    source            text,
    source_url        text,
    location          text,
    location_type     text,
    salary_min        int,
    salary_max        int,
    salary_market     int,
    salary_currency   text,
    salary_offered    int,
    interest          int,
    suitability       int,
    suitability_reason text,
    resume_version_id uuid REFERENCES resume_versions(id) ON DELETE SET NULL,
    jd_raw            text,
    jd_snapshot       jsonb,
    applied_at        timestamptz,
    follow_up_at      timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
