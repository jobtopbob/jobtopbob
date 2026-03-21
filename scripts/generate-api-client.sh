#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Generating TypeScript types from OpenAPI spec..."
cd "$ROOT_DIR/packages/api-client"
npx openapi-typescript "$ROOT_DIR/openapi/jobtopbob.yaml" -o src/schema.ts
echo "Done: packages/api-client/src/schema.ts"
