#!/bin/bash
# Destroys all Docker volumes and recreates the dev stack from scratch.
# This re-triggers the postgres init scripts (01-init-app-role.sh, 02-init-rxresume.sh) and runs all migrations.
set -euo pipefail

echo "Tearing down dev stack and destroying volumes..."
docker compose down -v

echo "Starting dev stack..."
docker compose up -d

echo "Waiting for migrations to complete..."
docker compose logs -f migrate 2>&1 | while read -r line; do
    echo "$line"
    if echo "$line" | grep -qE "(no change|error|done)"; then
        break
    fi
done

echo "Database reset complete."
