-- users
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_update_own ON users;

-- user_settings
DROP POLICY IF EXISTS settings_select ON user_settings;
DROP POLICY IF EXISTS settings_insert ON user_settings;
DROP POLICY IF EXISTS settings_update ON user_settings;

-- activity_log
DROP POLICY IF EXISTS log_select ON activity_log;
DROP POLICY IF EXISTS log_insert ON activity_log;

-- offers
DROP POLICY IF EXISTS offers_select ON offers;
DROP POLICY IF EXISTS offers_insert ON offers;
DROP POLICY IF EXISTS offers_update ON offers;

-- Standard tables
DROP POLICY IF EXISTS select_own ON stages;
DROP POLICY IF EXISTS insert_own ON stages;
DROP POLICY IF EXISTS update_own ON stages;
DROP POLICY IF EXISTS delete_own ON stages;

DROP POLICY IF EXISTS select_own ON oauth_tokens;
DROP POLICY IF EXISTS insert_own ON oauth_tokens;
DROP POLICY IF EXISTS update_own ON oauth_tokens;
DROP POLICY IF EXISTS delete_own ON oauth_tokens;

DROP POLICY IF EXISTS select_own ON companies;
DROP POLICY IF EXISTS insert_own ON companies;
DROP POLICY IF EXISTS update_own ON companies;
DROP POLICY IF EXISTS delete_own ON companies;

DROP POLICY IF EXISTS select_own ON contacts;
DROP POLICY IF EXISTS insert_own ON contacts;
DROP POLICY IF EXISTS update_own ON contacts;
DROP POLICY IF EXISTS delete_own ON contacts;

DROP POLICY IF EXISTS select_own ON resumes;
DROP POLICY IF EXISTS insert_own ON resumes;
DROP POLICY IF EXISTS update_own ON resumes;
DROP POLICY IF EXISTS delete_own ON resumes;

DROP POLICY IF EXISTS select_own ON resume_versions;
DROP POLICY IF EXISTS insert_own ON resume_versions;
DROP POLICY IF EXISTS update_own ON resume_versions;
DROP POLICY IF EXISTS delete_own ON resume_versions;

DROP POLICY IF EXISTS select_own ON jobs;
DROP POLICY IF EXISTS insert_own ON jobs;
DROP POLICY IF EXISTS update_own ON jobs;
DROP POLICY IF EXISTS delete_own ON jobs;

DROP POLICY IF EXISTS select_own ON interview_rounds;
DROP POLICY IF EXISTS insert_own ON interview_rounds;
DROP POLICY IF EXISTS update_own ON interview_rounds;
DROP POLICY IF EXISTS delete_own ON interview_rounds;

DROP POLICY IF EXISTS select_own ON job_assets;
DROP POLICY IF EXISTS insert_own ON job_assets;
DROP POLICY IF EXISTS update_own ON job_assets;
DROP POLICY IF EXISTS delete_own ON job_assets;

DROP POLICY IF EXISTS select_own ON ghostwriter_messages;
DROP POLICY IF EXISTS insert_own ON ghostwriter_messages;
DROP POLICY IF EXISTS update_own ON ghostwriter_messages;
DROP POLICY IF EXISTS delete_own ON ghostwriter_messages;

DROP POLICY IF EXISTS select_own ON email_events;
DROP POLICY IF EXISTS insert_own ON email_events;
DROP POLICY IF EXISTS update_own ON email_events;
DROP POLICY IF EXISTS delete_own ON email_events;

DROP POLICY IF EXISTS select_own ON webhooks;
DROP POLICY IF EXISTS insert_own ON webhooks;
DROP POLICY IF EXISTS update_own ON webhooks;
DROP POLICY IF EXISTS delete_own ON webhooks;

DROP POLICY IF EXISTS select_own ON tags;
DROP POLICY IF EXISTS insert_own ON tags;
DROP POLICY IF EXISTS update_own ON tags;
DROP POLICY IF EXISTS delete_own ON tags;

DROP POLICY IF EXISTS select_own ON taggings;
DROP POLICY IF EXISTS insert_own ON taggings;
DROP POLICY IF EXISTS update_own ON taggings;
DROP POLICY IF EXISTS delete_own ON taggings;

DROP POLICY IF EXISTS select_own ON scrape_runs;
DROP POLICY IF EXISTS insert_own ON scrape_runs;
DROP POLICY IF EXISTS update_own ON scrape_runs;
DROP POLICY IF EXISTS delete_own ON scrape_runs;
