#!/bin/bash
# Creates the restricted application roles with default privileges.
# Mounted into /docker-entrypoint-initdb.d/ — runs only on first container init.
set -euo pipefail

APP_PASSWORD="${POSTGRES_APP_PASSWORD:-changeme}"
WORKER_PASSWORD="${POSTGRES_WORKER_PASSWORD:-changeme}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Application role: DML only, no superuser/createdb/createrole
    -- Used by the API server — subject to RLS policies
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jobtopbob_app') THEN
            CREATE ROLE jobtopbob_app WITH LOGIN PASSWORD '${APP_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO jobtopbob_app;
    GRANT USAGE ON SCHEMA public TO jobtopbob_app;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jobtopbob_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO jobtopbob_app;

    -- Grant on ALL existing tables/sequences (covers tables created before this script)
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jobtopbob_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jobtopbob_app;

    -- Worker role: DML + BYPASSRLS (trusted internal service)
    -- Used by the background worker — bypasses RLS since it operates
    -- on behalf of users via validated task payloads, not direct user input.
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jobtopbob_worker') THEN
            CREATE ROLE jobtopbob_worker WITH LOGIN BYPASSRLS PASSWORD '${WORKER_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO jobtopbob_worker;
    GRANT USAGE ON SCHEMA public TO jobtopbob_worker;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jobtopbob_worker;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO jobtopbob_worker;

    -- Grant on ALL existing tables/sequences (covers tables created before this script)
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jobtopbob_worker;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jobtopbob_worker;
EOSQL

echo "01-init-app-role.sh: jobtopbob_app and jobtopbob_worker roles ready."
