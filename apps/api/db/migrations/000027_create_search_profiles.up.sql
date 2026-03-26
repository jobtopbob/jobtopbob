CREATE TABLE search_profiles (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name             text NOT NULL,
    source           text NOT NULL DEFAULT 'manual',
    resume_id        uuid REFERENCES resumes(id) ON DELETE SET NULL,
    keywords         text[],
    location         text,
    country          text DEFAULT 'US',
    job_type         text,
    experience_level text,
    remote_only      boolean DEFAULT false,
    salary_min       int,
    salary_max       int,
    skills           text[],
    target_roles     text[],
    is_active        boolean DEFAULT true,
    last_run_at      timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON search_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add deferred FK from scrape_runs → search_profiles (scrape_runs created in 000020)
ALTER TABLE scrape_runs
    ADD CONSTRAINT fk_scrape_runs_search_profile
    FOREIGN KEY (search_profile_id) REFERENCES search_profiles(id) ON DELETE SET NULL;

-- RLS (must be in this migration since the table is created here, after 000022/000024)
ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own ON search_profiles FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON search_profiles FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON search_profiles FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON search_profiles FOR DELETE USING (user_id = current_user_id());
