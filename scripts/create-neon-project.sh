#!/usr/bin/env bash
#
# create-neon-project.sh — provision a new Neon Postgres project via API.
#
# Usage:
#   NEON_API_KEY=napi_... ./scripts/create-neon-project.sh <client-slug>
#
# Outputs the new connection string (paste it into Render's DATABASE_URL slot).
#
# Requires `curl` and `jq` (install with `brew install jq` on Mac if missing).

set -euo pipefail

if [ -z "${NEON_API_KEY:-}" ]; then
  echo "ERROR: NEON_API_KEY env var is not set."
  echo "Find it in ~/Claude/cowork-handoff/PLATFORM_API_TOKENS.txt"
  echo "Then run: export NEON_API_KEY=napi_..."
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <client-slug>"
  echo "Example: $0 mikes-lawn-care"
  exit 1
fi

CLIENT_SLUG="$1"
PROJECT_NAME="${CLIENT_SLUG}-prod"
REGION="${NEON_REGION:-aws-us-east-1}"

echo "→ Creating Neon project: $PROJECT_NAME (region $REGION) ..."

RESPONSE=$(curl -fsS -X POST https://console.neon.tech/api/v2/projects \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"project\":{\"name\":\"$PROJECT_NAME\",\"region_id\":\"$REGION\"}}")

PROJECT_ID=$(echo "$RESPONSE" | jq -r '.project.id')
CONN_URI=$(echo "$RESPONSE" | jq -r '.connection_uris[0].connection_uri')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  echo "ERROR: Neon API call failed. Raw response:"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "✅ Project created."
echo ""
echo "Neon project ID:   $PROJECT_ID"
echo "Dashboard URL:     https://console.neon.tech/app/projects/$PROJECT_ID"
echo ""
echo "DATABASE_URL (paste this into Render's env vars):"
echo ""
echo "  $CONN_URI"
echo ""
echo "Next step: run the rest of SETUP.md — edit render.yaml's service name,"
echo "then go to https://dashboard.render.com/blueprints to import this repo."
