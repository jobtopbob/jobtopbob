-- user_id indexes for RLS performance
CREATE INDEX idx_stages_user_id ON stages(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_interview_rounds_user_id ON interview_rounds(user_id);
CREATE INDEX idx_job_assets_user_id ON job_assets(user_id);
CREATE INDEX idx_ghostwriter_user_id ON ghostwriter_messages(user_id);
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_email_events_user_id ON email_events(user_id);
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_taggings_user_id ON taggings(user_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_scrape_runs_user_id ON scrape_runs(user_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_jobs_user_status_created ON jobs(user_id, status, created_at DESC);
CREATE INDEX idx_activity_entity ON activity_log(user_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_ghostwriter_job ON ghostwriter_messages(user_id, job_id, created_at);
CREATE INDEX idx_interview_rounds_job ON interview_rounds(user_id, job_id, round);
CREATE INDEX idx_taggings_entity ON taggings(user_id, entity_type, entity_id);
