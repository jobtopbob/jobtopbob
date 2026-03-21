#!/usr/bin/env bash
# Seeds demo data for showcasing the application.
#
# 1. Creates the demo user via Better Auth (TypeScript — handles password hashing)
# 2. Seeds application data via Go API startup (SEED_DEMO_DATA=true)
#
# Usage:
#   ./scripts/seed-demo.sh              # Uses default DATABASE_URL
#   DATABASE_URL=... ./scripts/seed-demo.sh
#
# Prerequisites:
#   - PostgreSQL running with migrations applied
#   - Node.js + pnpm available (for Better Auth user creation)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Step 1: Creating demo user via Better Auth..."
cd "$ROOT_DIR"
pnpm --filter @jobtopbob/web seed:demo

echo "==> Step 2: Seeding application data via Go API..."
SEED_DEMO_DATA=true go run ./apps/api/cmd/api &
API_PID=$!

# Wait for the API to start and seed, then stop it
sleep 5
kill "$API_PID" 2>/dev/null || true
wait "$API_PID" 2>/dev/null || true

echo "==> Demo data seeded successfully!"
echo "    Login: demo@jobtopbob.com / demo1234"
