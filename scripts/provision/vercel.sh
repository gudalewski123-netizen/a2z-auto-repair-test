#!/usr/bin/env bash
# Create a Vercel project under Teddy's team, linked to the given GitHub repo.
#
# Usage:  ./scripts/provision/vercel.sh <project-name> [production-domain] [root-directory]
# Example (marketing site, root dir = .):
#   ./scripts/provision/vercel.sh acme-roofing acmeroofing.com
# Example (CRM, root dir = artifacts/crm):
#   ./scripts/provision/vercel.sh acme-roofing-crm crm.acmeroofing.com artifacts/crm
# Example (no custom domain yet):
#   ./scripts/provision/vercel.sh acme-roofing "" artifacts/crm
#
# Requires the current directory to be a git repo with origin set to a teddyk28/* repo
# (Vercel's GitHub App is installed on teddyk28 only).
#
# On success: prints the production URL (custom domain if provided, else *.vercel.app) to stdout.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

PROJECT_NAME="${1:-}"
PRODUCTION_DOMAIN="${2:-}"
ROOT_DIRECTORY="${3:-}"
[[ -n "${PROJECT_NAME}" ]] || die "usage: $0 <project-name> [production-domain] [root-directory]"

ORIGIN=$(git config --get remote.origin.url 2>/dev/null || true)
[[ -n "${ORIGIN}" ]] || die "no git remote 'origin' — run this from inside the client's repo"
GITHUB_REPO=$(echo "${ORIGIN}" | sed -E 's|.*github.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')

if [[ "${GITHUB_REPO}" != teddyk28/* ]]; then
  die "repo '${GITHUB_REPO}' is not under teddyk28 — Vercel's GitHub App can only see teddyk28/* repos. See CLAUDE.md section 0 and TEDDY-SETUP.md."
fi

require_env_file
require_var VERCEL_TOKEN
require_var VERCEL_TEAM_ID

if [[ -n "${ROOT_DIRECTORY}" ]]; then
  info "Creating Vercel project '${PROJECT_NAME}' linked to ${GITHUB_REPO} (root=${ROOT_DIRECTORY})..."
else
  info "Creating Vercel project '${PROJECT_NAME}' linked to ${GITHUB_REPO}..."
fi

# Build the create-project payload — only include rootDirectory if set
if [[ -n "${ROOT_DIRECTORY}" ]]; then
  CREATE_PAYLOAD=$(jq -n \
    --arg name "${PROJECT_NAME}" \
    --arg repo "${GITHUB_REPO}" \
    --arg rootDir "${ROOT_DIRECTORY}" \
    '{
      name: $name,
      gitRepository: {
        type: "github",
        repo: $repo
      },
      rootDirectory: $rootDir
    }')
else
  CREATE_PAYLOAD=$(jq -n \
    --arg name "${PROJECT_NAME}" \
    --arg repo "${GITHUB_REPO}" \
    '{
      name: $name,
      gitRepository: {
        type: "github",
        repo: $repo
      }
    }')
fi

RESPONSE=$(api_call -X POST "https://api.vercel.com/v11/projects?teamId=${VERCEL_TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${CREATE_PAYLOAD}")

PROJECT_ID=$(echo "${RESPONSE}" | jq -r '.id // empty')
[[ -n "${PROJECT_ID}" ]] || die "Vercel response missing project id: ${RESPONSE}"

info "Created Vercel project: id=${PROJECT_ID}"

info "Triggering initial deployment from main..."
DEPLOY_PAYLOAD=$(jq -n \
  --arg name "${PROJECT_NAME}" \
  --arg repo "${GITHUB_REPO}" \
  '{
    name: $name,
    gitSource: {
      type: "github",
      ref: "main",
      repo: $repo
    }
  }')

api_call -X POST "https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${DEPLOY_PAYLOAD}" > /dev/null || \
  info "  (deploy trigger failed — Vercel will still auto-deploy on next push to main)"

info "Deployment triggered."

if [[ -n "${PRODUCTION_DOMAIN}" ]]; then
  # For a subdomain like crm.acme.com we only attach the subdomain itself.
  # For an apex like acme.com we also attach the www. variant.
  ATTACH_DOMAINS=("${PRODUCTION_DOMAIN}")
  DOT_COUNT=$(echo -n "${PRODUCTION_DOMAIN}" | tr -cd '.' | wc -c | tr -d ' ')
  if [[ "${DOT_COUNT}" == "1" ]]; then
    ATTACH_DOMAINS+=("www.${PRODUCTION_DOMAIN}")
  fi

  for d in "${ATTACH_DOMAINS[@]}"; do
    info "Attaching domain '${d}'..."
    DOMAIN_PAYLOAD=$(jq -n --arg name "${d}" '{name: $name}')
    api_call -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}" \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${DOMAIN_PAYLOAD}" > /dev/null || \
      info "  (domain attach failed for ${d} — usually OK; retry after cloudflare.sh runs)"
  done
  echo "https://${PRODUCTION_DOMAIN}"
else
  echo "https://${PROJECT_NAME}.vercel.app"
fi
