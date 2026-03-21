#!/usr/bin/env bash
# Downloads company logos for the demo seed data from worldvectorlogo.com.
# Logos are stored in apps/api/internal/seed/logos/ and embedded in the Go binary.
#
# Usage: ./scripts/download-demo-logos.sh
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DEST="$ROOT_DIR/apps/api/internal/seed/logos"

mkdir -p "$DEST"

CDN="https://cdn.worldvectorlogo.com/logos"

download() {
  local filename="$1" slug="$2"
  echo "Downloading ${filename} (${slug})..."
  curl -sL "${CDN}/${slug}.svg" -o "$DEST/${filename}"
}

# name.svg -> worldvectorlogo slug
download vercel.svg vercel
download github.svg github
download linear.svg linear
download stripe.svg stripe-4
download figma.svg figma-icon
download datadog.svg datadog
download cloudflare.svg cloudflare
download shopify.svg shopify
download airbnb.svg airbnb
download twilio.svg twilio
download atlassian.svg atlassian
download hashicorp.svg hashicorp
download slack.svg slack
download meta.svg meta-3
download coinbase.svg coinbase-1

echo "Done — $(ls "$DEST"/*.svg 2>/dev/null | wc -l | tr -d ' ') logos downloaded to $DEST"
