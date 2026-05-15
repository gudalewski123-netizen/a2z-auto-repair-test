#!/usr/bin/env bash
#
# test-deepseek.sh — verify the DeepSeek API key works with a tiny test prompt.
# Costs less than $0.001 per run.
#
# Usage:
#   ./scripts/test-deepseek.sh [<api-key>]
#
# If <api-key> is omitted, reads DEEPSEEK_API_KEY from ~/.tier1-config/.env.

set -euo pipefail

API_KEY="${1:-}"
if [ -z "$API_KEY" ]; then
  ENV_FILE="${HOME}/.tier1-config/.env"
  if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    API_KEY="${DEEPSEEK_API_KEY:-}"
  fi
fi

if [ -z "$API_KEY" ]; then
  echo "Usage: $0 [<api-key>]"
  echo "OR set DEEPSEEK_API_KEY in ~/.tier1-config/.env"
  exit 1
fi

MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"

echo ""
echo "→ Pinging DeepSeek ($MODEL)..."

RESPONSE=$(curl -sS -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL}\",
    \"max_tokens\": 30,
    \"messages\": [{\"role\": \"user\", \"content\": \"Reply with exactly: TIER2 SMS BOT OK\"}]
  }")

ERR_TYPE=$(echo "$RESPONSE" | jq -r '.error.type // empty')
ERR_MSG=$(echo "$RESPONSE" | jq -r '.error.message // empty')

if [ -n "$ERR_TYPE" ] || [ -n "$ERR_MSG" ]; then
  echo "❌ FAILED"
  [ -n "$ERR_TYPE" ] && echo "    Error type: $ERR_TYPE"
  [ -n "$ERR_MSG" ] && echo "    Message:    $ERR_MSG"
  echo ""
  echo "Common causes:"
  echo "  - 401 invalid_request_error: API key wrong or revoked"
  echo "  - 402 insufficient_quota: account balance is zero — top up at platform.deepseek.com"
  echo "  - 429 rate_limit_exceeded: hammered too fast"
  echo "  - 500 server_error: DeepSeek capacity issue, retry"
  exit 1
fi

REPLY=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty')
USAGE=$(echo "$RESPONSE" | jq -r '"input=\(.usage.prompt_tokens)  output=\(.usage.completion_tokens)  total=\(.usage.total_tokens)"')
ACTUAL_MODEL=$(echo "$RESPONSE" | jq -r '.model // empty')

echo "✅ SUCCESS"
echo "    Model:  $ACTUAL_MODEL  (requested: $MODEL)"
echo "    Reply:  $REPLY"
echo "    Usage:  $USAGE tokens"
echo ""
echo "DeepSeek API key is valid and the $MODEL model is accessible."
