#!/usr/bin/env bash
#
# test-cal-com.sh — verify Cal.com API works with the configured credentials.
# Lists available slots in the next N days. Doesn't book anything (read-only).
#
# Usage:
#   ./scripts/test-cal-com.sh <api-key> <event-type-id> [<days-ahead>]
#
# Examples:
#   ./scripts/test-cal-com.sh cal_live_xxx 12345
#   ./scripts/test-cal-com.sh cal_live_xxx 12345 7
#
# Get the API key from cal.com → Settings → Developer → API keys.
# Get the event type ID from the URL when editing an event type
# (e.g. https://cal.com/event-types/12345 → ID is 12345).

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <api-key> <event-type-id> [<days-ahead>]"
  echo "Example: $0 cal_live_xxx 12345 7"
  exit 1
fi

API_KEY="$1"
EVENT_TYPE_ID="$2"
DAYS_AHEAD="${3:-7}"

# Compute date range: 2 hours from now → DAYS_AHEAD days from now
START=$(date -u -v+2H +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%S.000Z)
END=$(date -u -v+"${DAYS_AHEAD}d" +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -d "+${DAYS_AHEAD} days" +%Y-%m-%dT%H:%M:%S.000Z)

echo ""
echo "→ Querying Cal.com slots:"
echo "    Event Type ID:  $EVENT_TYPE_ID"
echo "    Window:         $START → $END (next $DAYS_AHEAD days)"
echo ""

URL="https://api.cal.com/v2/slots?eventTypeId=${EVENT_TYPE_ID}&startTime=${START}&endTime=${END}"

RESPONSE=$(curl -sS \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "cal-api-version: 2024-09-04" \
  -H "Accept: application/json" \
  "$URL")

# Check for error
STATUS=$(echo "$RESPONSE" | jq -r '.status // empty')
ERR_MSG=$(echo "$RESPONSE" | jq -r '.error // .message // empty')

if [ "$STATUS" != "success" ] && [ -n "$ERR_MSG" ]; then
  echo "❌ FAILED"
  echo "    Status: $STATUS"
  echo "    Error:  $ERR_MSG"
  echo ""
  echo "Common causes:"
  echo "  - 401: API key invalid or expired"
  echo "  - 404: Event type ID is wrong (or you don't have access to it)"
  echo "  - 422: API version mismatch — try removing the cal-api-version header"
  exit 1
fi

# Extract slot dates
SLOT_DAYS=$(echo "$RESPONSE" | jq -r '.data.slots // {} | keys | length')
TOTAL_SLOTS=$(echo "$RESPONSE" | jq -r '[.data.slots // {} | .[] | length] | add // 0')

echo "✅ SUCCESS"
echo "    Days with availability: $SLOT_DAYS"
echo "    Total slots:            $TOTAL_SLOTS"
echo ""

if [ "$TOTAL_SLOTS" -gt 0 ]; then
  echo "First 10 available slots:"
  echo "$RESPONSE" | jq -r '
    .data.slots // {} | to_entries | sort_by(.key) |
    map(.value | map(.time)) | flatten | .[0:10] |
    map("    " + .) | .[]
  '
  echo ""
  echo "(These ISO timestamps are what the AI passes to book_appointment — exactly as shown.)"
else
  echo "⚠ No slots available in the requested window."
  echo "  Possibly: event type has no availability rules set, or all slots are booked,"
  echo "  or the event type's calendar isn't connected. Check cal.com → event type settings."
fi
