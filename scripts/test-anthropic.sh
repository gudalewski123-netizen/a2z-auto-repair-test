#!/usr/bin/env bash
#
# test-anthropic.sh — verify the Anthropic API key works with a tiny test prompt.
# Costs less than $0.001 per run.
#
# Usage:
#   ./scripts/test-anthropic.sh [<api-key>]
#
# If <api-key> is omitted, reads ANTHROPIC_API_KEY from ~/.tier1-config/.env.

set -euo pipefail

API_KEY="${1:-}"
if [ -z "$API_KEY" ]; then
  ENV_FILE="${HOME}/.tier1-config/.env"
  if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    API_KEY="${ANTHROPIC_API_KEY:-}"
  fi
fi

if [ -z "$API_KEY" ]; then
  echo "Usage: $0 [<api-key>]"
  echo "OR set ANTHROPIC_API_KEY in ~/.tier1-config/.env"
  exit 1
fi

MODEL="claude-haiku-4-5"

echo ""
echo "→ Pinging Anthropic ($MODEL)..."

RESPONSE=$(curl -sS -X POST "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL}\",
    \"max_tokens\": 30,
    \"messages\": [{\"role\": \"user\", \"content\": \"Reply with exactly: TIER2 SMS BOT OK\"}]
  }")

ERR_TYPE=$(echo "$RESPONSE" | jq -r '.error.type // empty')
ERR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // empty')

if [ -n "$ERR_TYPE" ]; then
  echo "❌ FAILED"
  echo "    Error type: $ERR_TYPE"
  echo "    Message:    $ERR_MSG"
  echo ""
  echo "Common causes:"
  echo "  - 'authentication_error': API key wrong or revoked"
  echo "  - 'permission_error': key valid but missing model access"
  echo "  - 'rate_limit_error': hammered too fast"
  echo "  - 'overloaded_error': Anthropic capacity issue, retry"
  exit 1
fi

REPLY=$(echo "$RESPONSE" | jq -r '.content[0].text // empty')
USAGE=$(echo "$RESPONSE" | jq -r '"input_tokens=\(.usage.input_tokens)  output_tokens=\(.usage.output_tokens)"')

echo "✅ SUCCESS"
echo "    Reply:  $REPLY"
echo "    Usage:  $USAGE"
echo ""
echo "Anthropic API key is valid and the $MODEL model is accessible."
