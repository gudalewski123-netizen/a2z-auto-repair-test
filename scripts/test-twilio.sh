#!/usr/bin/env bash
#
# test-twilio.sh — verify Twilio SMS sending works with the configured credentials.
# Sends one real SMS (~$0.008) so don't hammer this in a loop.
#
# Usage:
#   ./scripts/test-twilio.sh <to-phone-E164> [<from-phone-E164>] [<message>]
#
# Examples:
#   ./scripts/test-twilio.sh +15551234567
#   ./scripts/test-twilio.sh +15551234567 +17152003545
#   ./scripts/test-twilio.sh +15551234567 +17152003545 "Custom test message"
#
# Reads TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN from ~/.tier1-config/.env.
# If <from-phone> is omitted, uses TWILIO_PHONE_NUMBER from the env (or the
# first number on the account if that's also unset).

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <to-phone-E164> [<from-phone-E164>] [<message>]"
  echo "Example: $0 +15551234567"
  exit 1
fi

TO="$1"
FROM="${2:-}"
MESSAGE="${3:-Test SMS from $(hostname) at $(date '+%H:%M:%S') — TIER-2 Twilio config OK}"

ENV_FILE="${HOME}/.tier1-config/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. See CLAUDE.md / TEDDY-SETUP.md for token setup."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${TWILIO_ACCOUNT_SID:?TWILIO_ACCOUNT_SID required in $ENV_FILE}"
: "${TWILIO_AUTH_TOKEN:?TWILIO_AUTH_TOKEN required in $ENV_FILE}"

# Resolve FROM if not given
if [ -z "$FROM" ]; then
  FROM="${TWILIO_PHONE_NUMBER:-}"
  if [ -z "$FROM" ]; then
    echo "→ TWILIO_PHONE_NUMBER not set; looking up first number on account..."
    FROM=$(curl -fsS -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
      "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json" \
      | jq -r '.incoming_phone_numbers[0].phone_number // empty')
    if [ -z "$FROM" ]; then
      echo "ERROR: no phone numbers on account. Provision one first."
      exit 1
    fi
    echo "  Using: $FROM"
  fi
fi

echo ""
echo "→ Sending test SMS:"
echo "    From:    $FROM"
echo "    To:      $TO"
echo "    Body:    $MESSAGE"
echo ""

RESPONSE=$(curl -sS -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json" \
  --data-urlencode "To=${TO}" \
  --data-urlencode "From=${FROM}" \
  --data-urlencode "Body=${MESSAGE}")

SID=$(echo "$RESPONSE" | jq -r '.sid // empty')
ERR=$(echo "$RESPONSE" | jq -r '.message // empty')

if [ -n "$SID" ]; then
  STATUS=$(echo "$RESPONSE" | jq -r '.status')
  echo "✅ SUCCESS"
  echo "    Message SID:   $SID"
  echo "    Status:        $STATUS  (expect 'queued' → 'sent' → 'delivered' over a few seconds)"
  echo ""
  echo "Check the recipient phone — message should arrive within ~30 seconds."
else
  echo "❌ FAILED"
  echo "    Error:  $ERR"
  echo ""
  echo "Common causes:"
  echo "  - Wrong phone number format (must be E.164, e.g. +15551234567)"
  echo "  - From number not owned by this account or not SMS-enabled"
  echo "  - A2P 10DLC not registered (toll-free + 10DLC compliance)"
  echo "  - Recipient is on a US carrier that blocks unregistered short codes"
  exit 1
fi
