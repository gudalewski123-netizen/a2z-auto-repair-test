#!/usr/bin/env bash
# Shared helpers for the provision scripts.
# Sourced by neon.sh, render.sh, vercel.sh, cloudflare.sh.

set -euo pipefail

TIER1_CONFIG_DIR="${HOME}/.tier1-config"
TIER1_ENV_FILE="${TIER1_CONFIG_DIR}/.env"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo ">> $*" >&2
}

require_env_file() {
  if [[ ! -f "${TIER1_ENV_FILE}" ]]; then
    die "${TIER1_ENV_FILE} not found. See CLAUDE.md section 10 for one-time token setup."
  fi
  # shellcheck disable=SC1090
  set -a; source "${TIER1_ENV_FILE}"; set +a
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    die "${name} is not set in ${TIER1_ENV_FILE}"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

# api_call — wraps curl so the response body is preserved on HTTP errors.
#   Usage: BODY=$(api_call <curl args...>)
#   Prints the JSON body on stdout for 2xx responses.
#   On non-2xx: exits the script with `die "..."` including the HTTP code and body.
api_call() {
  local out http_code body marker="__HTTP_STATUS_LINE__"
  out=$(curl -sS -w "${marker}%{http_code}" "$@") || die "curl failed"
  http_code="${out##*${marker}}"
  body="${out%${marker}*}"
  if [[ ! "${http_code}" =~ ^2[0-9][0-9]$ ]]; then
    die "API call failed (HTTP ${http_code}): ${body}"
  fi
  echo "${body}"
}

require_cmd curl
require_cmd jq
