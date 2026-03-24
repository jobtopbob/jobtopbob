ALTER TABLE jobs
    ADD COLUMN deadline         timestamptz,
    ADD COLUMN job_type         text,
    ADD COLUMN job_level        text,
    ADD COLUMN salary_interval  text,
    ADD COLUMN application_url  text,
    ADD COLUMN experience_range text,
    ADD COLUMN skills           jsonb,
    ADD COLUMN closed_at        timestamptz;
