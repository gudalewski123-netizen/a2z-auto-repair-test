#!/usr/bin/env bash
#
# bootstrap-client.sh — fork this template + provision Neon for a new client.
#
# Usage:
#   ./scripts/bootstrap-client.sh <client-slug> <client-domain>
#
# Example:
#   ./scripts/bootstrap-client.sh mikes-lawn-care mikeslawncare.com
#
# What this does:
#   1. Creates a Neon project for the client → captures DATABASE_URL
#   2. Updates render.yaml's service name to <client-slug>-api
#   3. Adds Cloudflare DNS (apex + www CNAMEs)
#   4. Prints the next-step manual actions you can't fully automate yet:
#        - Render Blueprint import (1 click in dashboard)
#        - Vercel project create + custom domain
#
# Source your token file before running:
#   source <(grep -E '^[A-Z_]+=.*' ~/Claude/cowork-handoff/PLATFORM_API_TOKENS.txt | sed 's/^/export /')

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <client-slug> <client-domain>"
  echo "Example: $0 mikes-lawn-care mikeslawncare.com"
  exit 1
fi

CLIENT_SLUG="$1"
CLIENT_DOMAIN="$2"

# Sanity-check tokens
: "${NEON_API_KEY:?NEON_API_KEY is required}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Bootstrapping client: $CLIENT_SLUG ($CLIENT_DOMAIN)"
echo "════════════════════════════════════════════════════════════"
echo ""

# 1. Neon
echo "[1/3] Creating Neon project ..."
"$SCRIPT_DIR/create-neon-project.sh" "$CLIENT_SLUG"
echo ""

# 2. Rename render.yaml service
echo "[2/3] Updating render.yaml service name ..."
if [ -f "$REPO_ROOT/render.yaml" ]; then
  # Replace the placeholder service name
  sed -i.bak "s/name: tier1-template-api/name: ${CLIENT_SLUG}-api/g; s/name: tier2-template-api/name: ${CLIENT_SLUG}-api/g" "$REPO_ROOT/render.yaml"
  rm "$REPO_ROOT/render.yaml.bak"
  echo "  ✓ render.yaml service name → ${CLIENT_SLUG}-api"
else
  echo "  ⚠ no render.yaml found at repo root; skipping"
fi

# 3. Cloudflare DNS
echo ""
echo "[3/3] Creating Cloudflare DNS ..."
"$SCRIPT_DIR/add-cloudflare-dns.sh" "$CLIENT_DOMAIN"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Automated steps complete — manual steps remaining:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  1. Commit + push the updated render.yaml:"
echo "       git add render.yaml && git commit -m 'Rename service for $CLIENT_SLUG' && git push"
echo ""
echo "  2. Import Render Blueprint:"
echo "       Go to https://dashboard.render.com/blueprints"
echo "       Click 'New Blueprint Instance'"
echo "       Pick the repo (this one's fork)"
echo "       Paste DATABASE_URL (printed above) + ALLOWED_ORIGINS=https://$CLIENT_DOMAIN,https://www.$CLIENT_DOMAIN"
echo "       Save → wait ~3 min for deploy"
echo ""
echo "  3. Update artifacts/trades-template/vercel.json with the live Render URL"
echo "     (Render assigns the URL after step 2 completes)"
echo ""
echo "  4. Create Vercel project via API (see SETUP.md step 6)"
echo ""
echo "  5. Add $CLIENT_DOMAIN as a custom domain in Vercel (see SETUP.md step 8)"
echo ""
