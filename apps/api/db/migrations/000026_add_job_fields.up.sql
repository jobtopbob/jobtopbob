ALTER TABLE jobs
    ADD COLUMN deadline         timestamptz,
    ADD COLUMN job_type         text,
    ADD COLUMN job_level        text,
    ADD COLUMN salary_interval  text,
    ADD COLUMN application_url  text,
    ADD COLUMN experience_range text,
    ADD COLUMN skills           jsonb,
    ADD COLUMN closed_at        timestamptz,
    ADD COLUMN dedup_hash       text,
    ADD COLUMN scrape_run_id    uuid REFERENCES scrape_runs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_jobs_dedup_hash_user ON jobs(user_id, dedup_hash) WHERE dedup_hash IS NOT NULL;
