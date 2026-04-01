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
    ADD COLUMN scrape_run_id    uuid REFERENCES scrape_runs(id) ON DELETE SET NULL,
    ADD COLUMN posted_at        timestamptz,
    ADD COLUMN via              text,
    ADD COLUMN job_highlights   jsonb,
    ADD COLUMN benefits         jsonb,
    ADD COLUMN external_id      text,
    ADD COLUMN apply_options    jsonb,
    ADD COLUMN thumbnail_url    text;

CREATE UNIQUE INDEX idx_jobs_dedup_hash_user ON jobs(user_id, dedup_hash) WHERE dedup_hash IS NOT NULL;
