-- Grant DML on all existing tables and sequences to the restricted app role.
-- Future tables/sequences are covered by ALTER DEFAULT PRIVILEGES in the init script.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'jobtopbob_app') THEN
        GRANT USAGE ON SCHEMA public TO jobtopbob_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jobtopbob_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jobtopbob_app;
    END IF;
END
$$;
