DROP INDEX IF EXISTS idx_jobs_dedup_hash_user;

ALTER TABLE jobs
    DROP COLUMN IF EXISTS deadline,
    DROP COLUMN IF EXISTS job_type,
    DROP COLUMN IF EXISTS job_level,
    DROP COLUMN IF EXISTS salary_interval,
    DROP COLUMN IF EXISTS application_url,
    DROP COLUMN IF EXISTS experience_range,
    DROP COLUMN IF EXISTS skills,
    DROP COLUMN IF EXISTS closed_at,
    DROP COLUMN IF EXISTS dedup_hash,
    DROP COLUMN IF EXISTS scrape_run_id,
    DROP COLUMN IF EXISTS posted_at,
    DROP COLUMN IF EXISTS via,
    DROP COLUMN IF EXISTS job_highlights,
    DROP COLUMN IF EXISTS benefits,
    DROP COLUMN IF EXISTS external_id,
    DROP COLUMN IF EXISTS apply_options,
    DROP COLUMN IF EXISTS thumbnail_url;
