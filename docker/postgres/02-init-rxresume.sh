#!/bin/bash
# Creates the rxresume database for Reactive Resume.
# Mounted into /docker-entrypoint-initdb.d/ — runs only on first container init.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE rxresume'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'rxresume')\gexec
EOSQL

echo "02-init-rxresume.sh: rxresume database ready."
