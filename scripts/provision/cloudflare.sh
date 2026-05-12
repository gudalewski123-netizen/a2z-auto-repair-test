#!/usr/bin/env bash
# Add Cloudflare DNS CNAME records pointing at Vercel for the given domain.
# Apex (@) and www, both proxied=false (gray cloud).
#
# Usage:  ./scripts/provision/cloudflare.sh <domain>
# Example: ./scripts/provision/cloudflare.sh acmeroofing.com
#
# The domain must already be added to Cloudflare under the account this token has access to.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

DOMAIN="${1:-}"
[[ -n "${DOMAIN}" ]] || die "usage: $0 <domain>"

require_env_file
require_var CLOUDFLARE_API_TOKEN

VERCEL_CNAME_TARGET="vercel-dns-017.com"

info "Looking up Cloudflare zone for ${DOMAIN}..."
ZONE_LOOKUP=$(api_call \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}")
ZONE_ID=$(echo "${ZONE_LOOKUP}" | jq -r '.result[0].id // empty')

[[ -n "${ZONE_ID}" ]] || die "no Cloudflare zone found for ${DOMAIN} (is the domain added to Cloudflare?)"
info "Found zone: ${ZONE_ID}"

upsert_cname() {
  local record_name="$1"
  local target="$2"
  info "Upserting CNAME ${record_name} -> ${target} (proxied=false)..."

  local existing_id
  existing_id=$(api_call \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${record_name}&type=CNAME" | \
    jq -r '.result[0].id // empty')

  local body
  body=$(jq -n \
    --arg name "${record_name}" \
    --arg target "${target}" \
    '{type: "CNAME", name: $name, content: $target, proxied: false, ttl: 1}')

  if [[ -n "${existing_id}" ]]; then
    api_call -X PUT \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${body}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${existing_id}" > /dev/null
    info "  Updated existing record (${existing_id})"
  else
    api_call -X POST \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${body}" \
      "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" > /dev/null
    info "  Created new record"
  fi
}

upsert_cname "${DOMAIN}"      "${VERCEL_CNAME_TARGET}"
upsert_cname "www.${DOMAIN}"  "${VERCEL_CNAME_TARGET}"

info "Done. ${DOMAIN} and www.${DOMAIN} now CNAME to ${VERCEL_CNAME_TARGET} (gray cloud)."
echo "https://${DOMAIN}"
