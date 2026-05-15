#!/usr/bin/env bash
#
# provision-twilio-number.sh — buy a new Twilio phone number for a client and
# attach it to the Marketing A2P Messaging Service. Prints the values to paste
# into the client's Render env vars.
#
# Usage:
#   ./scripts/provision-twilio-number.sh <client-slug> [<area-code>] [<render-url>]
#
# Examples:
#   ./scripts/provision-twilio-number.sh acme-roofing            # any area code, no webhook setup
#   ./scripts/provision-twilio-number.sh acme-roofing 561        # request 561 area code
#   ./scripts/provision-twilio-number.sh acme-roofing 561 https://acme-roofing-api.onrender.com
#
# When the third arg (render-url) is provided, the script also configures the
# new number's SMS + Voice webhooks to point at that Render service. Otherwise
# you'll need to set those manually in the Twilio console.
#
# Requires the standard ~/.tier1-config/.env to have TWILIO_ACCOUNT_SID +
# TWILIO_AUTH_TOKEN. Reads the Marketing A2P Messaging Service SID from the
# .env file too (must be set as TWILIO_MESSAGING_SERVICE_SID).

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <client-slug> [<area-code>] [<render-url>]"
  echo "Example: $0 acme-roofing 561 https://acme-roofing-api.onrender.com"
  exit 1
fi

CLIENT_SLUG="$1"
AREA_CODE="${2:-}"
RENDER_URL="${3:-}"

ENV_FILE="${HOME}/.tier1-config/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. See CLAUDE.md / TEDDY-SETUP.md for token setup."
  exit 1
fi

# Source env vars
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${TWILIO_ACCOUNT_SID:?TWILIO_ACCOUNT_SID is required in $ENV_FILE}"
: "${TWILIO_AUTH_TOKEN:?TWILIO_AUTH_TOKEN is required in $ENV_FILE}"

# Marketing A2P Messaging Service SID — required for A2P 10DLC compliance
MS_SID="${TWILIO_MESSAGING_SERVICE_SID:-MG66c41569bdfe7e080d7063b2e1151814}"

API="https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}"
AUTH="${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Provisioning Twilio number for: $CLIENT_SLUG"
echo "  Messaging Service: $MS_SID"
[ -n "$RENDER_URL" ] && echo "  Webhooks pointing at: $RENDER_URL"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: search for an available local number
echo "→ Searching for available local US numbers..."
SEARCH_URL="${API}/AvailablePhoneNumbers/US/Local.json?SmsEnabled=true&VoiceEnabled=true"
[ -n "$AREA_CODE" ] && SEARCH_URL="${SEARCH_URL}&AreaCode=${AREA_CODE}"

CANDIDATE=$(curl -fsS -u "$AUTH" "$SEARCH_URL" | jq -r '.available_phone_numbers[0].phone_number // empty')
if [ -z "$CANDIDATE" ]; then
  echo "ERROR: No available numbers found${AREA_CODE:+ in area code $AREA_CODE}."
  exit 1
fi
echo "  Found: $CANDIDATE"
echo ""

# Step 2: purchase it (with optional webhooks)
echo "→ Purchasing $CANDIDATE..."
BUY_FORM="PhoneNumber=${CANDIDATE}&FriendlyName=${CLIENT_SLUG}"
if [ -n "$RENDER_URL" ]; then
  SMS_URL="${RENDER_URL}/api/sms/incoming"
  VOICE_URL="${RENDER_URL}/api/voice/incoming"
  BUY_FORM="${BUY_FORM}&SmsUrl=${SMS_URL}&SmsMethod=POST&VoiceUrl=${VOICE_URL}&VoiceMethod=POST"
fi

PURCHASE_RESP=$(curl -fsS -u "$AUTH" -X POST "${API}/IncomingPhoneNumbers.json" -d "$BUY_FORM")
NUMBER_SID=$(echo "$PURCHASE_RESP" | jq -r '.sid')
PHONE_NUMBER=$(echo "$PURCHASE_RESP" | jq -r '.phone_number')

if [ -z "$NUMBER_SID" ] || [ "$NUMBER_SID" = "null" ]; then
  echo "ERROR: Purchase failed. Response:"
  echo "$PURCHASE_RESP"
  exit 1
fi
echo "  Bought: $PHONE_NUMBER (sid: $NUMBER_SID)"
echo ""

# Step 3: add to the Marketing A2P Messaging Service
echo "→ Adding to Messaging Service $MS_SID (for A2P 10DLC compliance)..."
ADD_RESP=$(curl -fsS -u "$AUTH" -X POST \
  "https://messaging.twilio.com/v1/Services/${MS_SID}/PhoneNumbers" \
  -d "PhoneNumberSid=${NUMBER_SID}")
ADD_OK=$(echo "$ADD_RESP" | jq -r '.sid // empty')
if [ -n "$ADD_OK" ]; then
  echo "  ✓ Attached"
else
  echo "  ⚠ Attach failed (number is still bought): $ADD_RESP"
fi
echo ""

# Backup details locally
mkdir -p "${HOME}/.tier1-config/twilio-numbers"
{
  echo "client_slug=${CLIENT_SLUG}"
  echo "phone_number=${PHONE_NUMBER}"
  echo "phone_number_sid=${NUMBER_SID}"
  echo "messaging_service_sid=${MS_SID}"
  [ -n "$RENDER_URL" ] && echo "render_url=${RENDER_URL}"
  echo "purchased_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${HOME}/.tier1-config/twilio-numbers/${CLIENT_SLUG}.txt"
chmod 600 "${HOME}/.tier1-config/twilio-numbers/${CLIENT_SLUG}.txt"

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Done. Paste these env vars into Render → service → Environment:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "    TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}"
echo "    TWILIO_AUTH_TOKEN=<from ~/.tier1-config/.env>"
echo "    TWILIO_PHONE_NUMBER=${PHONE_NUMBER}"
echo "    TWILIO_MESSAGING_SERVICE_SID=${MS_SID}"
[ -n "$RENDER_URL" ] && echo "    PUBLIC_BASE_URL=${RENDER_URL}"
echo "    CLIENT_CELL_NUMBER=<the business owner's actual cell, E.164>"
echo "    BUSINESS_NAME=<from business.config.json>"
echo "    BUSINESS_TRADE=<from config.ts BUSINESS.trade>"
echo "    BUSINESS_LOCATION=<from config.ts BUSINESS.location>"
echo "    BUSINESS_PHONE=${PHONE_NUMBER}"
echo "    # Optional: ANTHROPIC_API_KEY=sk-ant-... for AI replies"
echo ""
echo "  Backup saved at: ~/.tier1-config/twilio-numbers/${CLIENT_SLUG}.txt"
echo ""
[ -z "$RENDER_URL" ] && cat <<EOF
  ⚠ You did NOT pass a render-url, so the number's webhooks are blank.
    Either re-run with the URL as the 3rd arg, OR set them manually in
    Twilio console:
      Voice URL → ${RENDER_URL:-<your-render-url>}/api/voice/incoming
      SMS URL   → ${RENDER_URL:-<your-render-url>}/api/sms/incoming
EOF
