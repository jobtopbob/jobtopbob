#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../apps/api/db"

echo "Running sqlc generate..."
cd "$API_DIR"
sqlc generate
echo "sqlc generation complete."
