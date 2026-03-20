-- Revoking grants is a no-op if the role doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'jobtopbob_app') THEN
        REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM jobtopbob_app;
        REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM jobtopbob_app;
    END IF;
END
$$;
