#!/bin/bash
# Creates the restricted application role and the rxresume database.
# Mounted into /docker-entrypoint-initdb.d/ — runs only on first container init.
set -euo pipefail

APP_PASSWORD="${POSTGRES_APP_PASSWORD:-changeme}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Application role: DML only, no superuser/createdb/createrole
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jobtopbob_app') THEN
            CREATE ROLE jobtopbob_app WITH LOGIN PASSWORD '${APP_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO jobtopbob_app;
    GRANT USAGE ON SCHEMA public TO jobtopbob_app;

    -- Future tables created by migrations automatically get DML grants
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jobtopbob_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO jobtopbob_app;
EOSQL

# Create rxresume database for Reactive Resume
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE rxresume'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rxresume')\gexec
EOSQL

echo "init-roles.sh: jobtopbob_app role and rxresume database ready."
