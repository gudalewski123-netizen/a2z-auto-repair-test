#!/usr/bin/env bash
#
# add-cloudflare-dns.sh — add the apex + www CNAME records pointing at Vercel.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=cfut_... ./scripts/add-cloudflare-dns.sh <domain>
#
# Example: ./scripts/add-cloudflare-dns.sh mikeslawncare.com
#
# Adds:
#   <domain>      CNAME  vercel-dns-017.com  (proxy: off)
#   www.<domain>  CNAME  vercel-dns-017.com  (proxy: off)

set -euo pipefail

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN env var is not set."
  echo "Find it in ~/Claude/cowork-handoff/PLATFORM_API_TOKENS.txt"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

DOMAIN="$1"
TARGET="${VERCEL_DNS_TARGET:-vercel-dns-017.com}"

echo "→ Looking up Cloudflare zone for $DOMAIN ..."

ZONE_ID=$(curl -fsS -G "https://api.cloudflare.com/client/v4/zones" \
  --data-urlencode "name=$DOMAIN" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Accept: application/json" \
  | jq -r '.result[0].id')

if [ -z "$ZONE_ID" ] || [ "$ZONE_ID" = "null" ]; then
  echo "ERROR: zone '$DOMAIN' not found. Is it registered on this Cloudflare account?"
  exit 1
fi
echo "  zone id: $ZONE_ID"

for name in "$DOMAIN" "www.$DOMAIN"; do
  echo "→ Creating CNAME $name → $TARGET (proxied: false) ..."
  curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"CNAME\",\"name\":\"$name\",\"content\":\"$TARGET\",\"proxied\":false}" \
    | jq -r '.success' \
    | grep -q true && echo "  ✓ $name" || echo "  ⚠ failed (already exists?)"
done

echo ""
echo "✅ DNS records created. Vercel SSL will provision in ~5 min."
echo ""
echo "Next: in Vercel, add '$DOMAIN' as a custom domain for the project."
