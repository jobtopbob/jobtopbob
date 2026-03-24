ALTER TABLE jobs
    DROP COLUMN IF EXISTS deadline,
    DROP COLUMN IF EXISTS job_type,
    DROP COLUMN IF EXISTS job_level,
    DROP COLUMN IF EXISTS salary_interval,
    DROP COLUMN IF EXISTS application_url,
    DROP COLUMN IF EXISTS experience_range,
    DROP COLUMN IF EXISTS skills,
    DROP COLUMN IF EXISTS closed_at;
