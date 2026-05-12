#!/usr/bin/env bash
# Create a new Neon project under the team org and print its DATABASE_URL.
#
# Usage:  ./scripts/provision/neon.sh <project-name>
# Example: ./scripts/provision/neon.sh acme-roofing-prod
#
# On success: prints the DATABASE_URL to stdout (with ?sslmode=require&channel_binding=require).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

PROJECT_NAME="${1:-}"
[[ -n "${PROJECT_NAME}" ]] || die "usage: $0 <project-name>"

require_env_file
require_var NEON_API_KEY
require_var NEON_ORG_ID

info "Creating Neon project '${PROJECT_NAME}' under org ${NEON_ORG_ID}..."

PAYLOAD=$(jq -n \
  --arg name "${PROJECT_NAME}" \
  --arg orgId "${NEON_ORG_ID}" \
  '{
    project: {
      name: $name,
      org_id: $orgId,
      pg_version: 16,
      region_id: "aws-us-east-1"
    }
  }')

RESPONSE=$(api_call -X POST "https://console.neon.tech/api/v2/projects" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

PROJECT_ID=$(echo "${RESPONSE}" | jq -r '.project.id')
CONN_URI=$(echo "${RESPONSE}" | jq -r '.connection_uris[0].connection_uri // empty')

[[ -n "${PROJECT_ID}" ]] || die "Neon response missing project id: ${RESPONSE}"
[[ -n "${CONN_URI}" ]] || die "Neon response missing connection_uri (check console.neon.tech)"

# Ensure both sslmode=require and channel_binding=require are in the URL.
add_param_if_missing() {
  local param="$1"
  if [[ "${CONN_URI}" != *"${param}="* ]]; then
    if [[ "${CONN_URI}" == *"?"* ]]; then
      CONN_URI="${CONN_URI}&${param}=require"
    else
      CONN_URI="${CONN_URI}?${param}=require"
    fi
  fi
}
add_param_if_missing "sslmode"
add_param_if_missing "channel_binding"

mkdir -p "${TIER1_CONFIG_DIR}/databases"
echo "${CONN_URI}" > "${TIER1_CONFIG_DIR}/databases/${PROJECT_NAME}.txt"
chmod 600 "${TIER1_CONFIG_DIR}/databases/${PROJECT_NAME}.txt"

info "Created Neon project: id=${PROJECT_ID} name=${PROJECT_NAME}"
info "Connection string backed up to ${TIER1_CONFIG_DIR}/databases/${PROJECT_NAME}.txt"

echo "${CONN_URI}"
