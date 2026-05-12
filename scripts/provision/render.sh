#!/usr/bin/env bash
# Create a Render web service for the api-server in this repo and print its .onrender.com URL.
#
# Usage:  ./scripts/provision/render.sh <service-name> <database-url> <allowed-origins> [github-repo]
# Example: ./scripts/provision/render.sh acme-roofing-api "postgresql://..." "https://acme.com,https://www.acme.com"
#
# Requires the current directory to be a git repo with origin set to a GitHub repo
# that Render's GitHub App can access (i.e. under teddyk28), UNLESS the optional
# 4th arg <github-repo> is provided (e.g. "teddyk28/acme-roofing").
#
# On success: prints the https://<service>.onrender.com URL to stdout.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

SERVICE_NAME="${1:-}"
DATABASE_URL="${2:-}"
ALLOWED_ORIGINS="${3:-}"
GITHUB_REPO="${4:-}"
[[ -n "${SERVICE_NAME}" && -n "${DATABASE_URL}" && -n "${ALLOWED_ORIGINS}" ]] || \
  die "usage: $0 <service-name> <database-url> <allowed-origins> [github-repo]"

if [[ -z "${GITHUB_REPO}" ]]; then
  ORIGIN=$(git config --get remote.origin.url 2>/dev/null || true)
  [[ -n "${ORIGIN}" ]] || die "no git remote 'origin'; pass GitHub repo as 4th arg"
  GITHUB_REPO=$(echo "${ORIGIN}" | sed -E 's|.*github.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')
fi

# Sanity check: Render's GitHub App is on teddyk28. Repos elsewhere will be rejected.
if [[ "${GITHUB_REPO}" != teddyk28/* ]]; then
  die "repo '${GITHUB_REPO}' is not under teddyk28 — Render's GitHub App can only see teddyk28/* repos. See CLAUDE.md section 1 and TEDDY-SETUP.md."
fi

require_env_file
require_var RENDER_API_KEY
require_var RENDER_OWNER_ID

REPO_URL="https://github.com/${GITHUB_REPO}"
info "Creating Render web service '${SERVICE_NAME}' from ${REPO_URL}..."

BUILD_CMD='corepack enable && NODE_ENV=development pnpm install --no-frozen-lockfile && pnpm --filter @workspace/db run push && pnpm --filter @workspace/api-server run build'
START_CMD='pnpm --filter @workspace/api-server run start'

JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+/')
ADMIN_API_KEY=$(openssl rand -base64 32 | tr -d '=+/')

PAYLOAD=$(jq -n \
  --arg name "${SERVICE_NAME}" \
  --arg ownerId "${RENDER_OWNER_ID}" \
  --arg repo "${REPO_URL}" \
  --arg buildCmd "${BUILD_CMD}" \
  --arg startCmd "${START_CMD}" \
  --arg databaseUrl "${DATABASE_URL}" \
  --arg allowedOrigins "${ALLOWED_ORIGINS}" \
  --arg jwtSecret "${JWT_SECRET}" \
  --arg adminKey "${ADMIN_API_KEY}" \
  '{
    type: "web_service",
    name: $name,
    ownerId: $ownerId,
    repo: $repo,
    branch: "main",
    autoDeploy: "yes",
    serviceDetails: {
      env: "node",
      plan: "free",
      region: "oregon",
      buildCommand: $buildCmd,
      startCommand: $startCmd,
      healthCheckPath: "/api/health"
    },
    envVars: [
      { key: "NODE_ENV",        value: "production" },
      { key: "DATABASE_URL",    value: $databaseUrl },
      { key: "ALLOWED_ORIGINS", value: $allowedOrigins },
      { key: "JWT_SECRET",      value: $jwtSecret },
      { key: "ADMIN_API_KEY",   value: $adminKey },
      { key: "LEAD_NOTIFY_TO",  value: "teddy.nk28@gmail.com" }
    ]
  }')

RESPONSE=$(api_call -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}")

SERVICE_ID=$(echo "${RESPONSE}" | jq -r '.service.id // .id // empty')
SERVICE_URL=$(echo "${RESPONSE}" | jq -r '.service.serviceDetails.url // .serviceDetails.url // empty')

[[ -n "${SERVICE_ID}" ]] || die "Render response missing service id: ${RESPONSE}"
[[ -n "${SERVICE_URL}" ]] || die "Render response missing service URL: ${RESPONSE}"

mkdir -p "${TIER1_CONFIG_DIR}/services"
{
  echo "service_id=${SERVICE_ID}"
  echo "service_url=${SERVICE_URL}"
  echo "JWT_SECRET=${JWT_SECRET}"
  echo "ADMIN_API_KEY=${ADMIN_API_KEY}"
} > "${TIER1_CONFIG_DIR}/services/${SERVICE_NAME}.txt"
chmod 600 "${TIER1_CONFIG_DIR}/services/${SERVICE_NAME}.txt"

info "Created Render service: id=${SERVICE_ID} url=${SERVICE_URL}"
info "Secrets backed up to ${TIER1_CONFIG_DIR}/services/${SERVICE_NAME}.txt"

echo "${SERVICE_URL}"
