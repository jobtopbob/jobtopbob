-- Note: Better Auth's "user" table has no RLS (managed by BA as superuser).

-- =============================================================================
-- user_settings — no DELETE (settings are upserted, never deleted)
-- =============================================================================
CREATE POLICY settings_select ON user_settings FOR SELECT
    USING (user_id = current_user_id());
CREATE POLICY settings_insert ON user_settings FOR INSERT
    WITH CHECK (user_id = current_user_id());
CREATE POLICY settings_update ON user_settings FOR UPDATE
    USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());

-- =============================================================================
-- activity_log — append-only (immutable audit trail)
-- =============================================================================
CREATE POLICY log_select ON activity_log FOR SELECT
    USING (user_id = current_user_id());
CREATE POLICY log_insert ON activity_log FOR INSERT
    WITH CHECK (user_id = current_user_id());

-- =============================================================================
-- offers — no DELETE (archive, don't delete offer records)
-- =============================================================================
CREATE POLICY offers_select ON offers FOR SELECT
    USING (user_id = current_user_id());
CREATE POLICY offers_insert ON offers FOR INSERT
    WITH CHECK (user_id = current_user_id());
CREATE POLICY offers_update ON offers FOR UPDATE
    USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());

-- =============================================================================
-- Standard pattern: full CRUD scoped to current_user_id()
-- Applies to: stages, oauth_tokens, companies, contacts, resumes,
--             resume_versions, jobs, interview_rounds, job_assets,
--             ghostwriter_messages, email_events, webhooks, tags,
--             taggings, scrape_runs
-- =============================================================================

-- stages
CREATE POLICY select_own ON stages FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON stages FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON stages FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON stages FOR DELETE USING (user_id = current_user_id());

-- oauth_tokens
CREATE POLICY select_own ON oauth_tokens FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON oauth_tokens FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON oauth_tokens FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON oauth_tokens FOR DELETE USING (user_id = current_user_id());

-- companies
CREATE POLICY select_own ON companies FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON companies FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON companies FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON companies FOR DELETE USING (user_id = current_user_id());

-- contacts
CREATE POLICY select_own ON contacts FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON contacts FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON contacts FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON contacts FOR DELETE USING (user_id = current_user_id());

-- resumes
CREATE POLICY select_own ON resumes FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON resumes FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON resumes FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON resumes FOR DELETE USING (user_id = current_user_id());

-- resume_versions
CREATE POLICY select_own ON resume_versions FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON resume_versions FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON resume_versions FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON resume_versions FOR DELETE USING (user_id = current_user_id());

-- jobs
CREATE POLICY select_own ON jobs FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON jobs FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON jobs FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON jobs FOR DELETE USING (user_id = current_user_id());

-- interview_rounds
CREATE POLICY select_own ON interview_rounds FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON interview_rounds FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON interview_rounds FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON interview_rounds FOR DELETE USING (user_id = current_user_id());

-- job_assets
CREATE POLICY select_own ON job_assets FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON job_assets FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON job_assets FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON job_assets FOR DELETE USING (user_id = current_user_id());

-- ghostwriter_messages
CREATE POLICY select_own ON ghostwriter_messages FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON ghostwriter_messages FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON ghostwriter_messages FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON ghostwriter_messages FOR DELETE USING (user_id = current_user_id());

-- email_events
CREATE POLICY select_own ON email_events FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON email_events FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON email_events FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON email_events FOR DELETE USING (user_id = current_user_id());

-- webhooks
CREATE POLICY select_own ON webhooks FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON webhooks FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON webhooks FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON webhooks FOR DELETE USING (user_id = current_user_id());

-- tags
CREATE POLICY select_own ON tags FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON tags FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON tags FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON tags FOR DELETE USING (user_id = current_user_id());

-- taggings
CREATE POLICY select_own ON taggings FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON taggings FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON taggings FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON taggings FOR DELETE USING (user_id = current_user_id());

-- scrape_runs
CREATE POLICY select_own ON scrape_runs FOR SELECT USING (user_id = current_user_id());
CREATE POLICY insert_own ON scrape_runs FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY update_own ON scrape_runs FOR UPDATE USING (user_id = current_user_id()) WITH CHECK (user_id = current_user_id());
CREATE POLICY delete_own ON scrape_runs FOR DELETE USING (user_id = current_user_id());

