#!/bin/bash
# Creates a read-only role for the Go API to query the rxresume database.
# Used for per-user resume sync (SELECT on user + resume tables only).
# Mounted into /docker-entrypoint-initdb.d/ — runs only on first container init.
set -euo pipefail

READER_PASSWORD="${RXRESUME_READER_PASSWORD:-changeme}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname rxresume <<-EOSQL
    -- Read-only role: SELECT only, no write/DDL privileges
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rxresume_reader') THEN
            CREATE ROLE rxresume_reader WITH LOGIN PASSWORD '${READER_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE rxresume TO rxresume_reader;
    GRANT USAGE ON SCHEMA public TO rxresume_reader;

    -- Only grant SELECT on the specific tables the Go API needs
    -- (tables are created by RxResume's Drizzle migrations on first boot,
    --  so we also set default privileges for tables created later)
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT ON TABLES TO rxresume_reader;
EOSQL

echo "04-init-rxresume-reader.sh: rxresume_reader role ready."
