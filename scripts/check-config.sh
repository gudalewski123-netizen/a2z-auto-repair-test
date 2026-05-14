#!/usr/bin/env bash
# Pre-build safety check: fails the build if BUSINESS.email is empty
# AND PITCH_MODE is false — prevents shipping a client site that silently
# routes form submissions to the default fallback (teddy.nk28@gmail.com).
#
# Usage:  bash scripts/check-config.sh
# Skip:   SKIP_CONFIG_CHECK=1 pnpm build

set -e

if [ "${SKIP_CONFIG_CHECK:-0}" = "1" ]; then
  echo "⚠ SKIP_CONFIG_CHECK=1 — bypassing config validation"
  exit 0
fi

# Find config.ts (may be invoked from repo root or from trades-template/)
if [ -f "src/config.ts" ]; then
  CONFIG="src/config.ts"
elif [ -f "artifacts/trades-template/src/config.ts" ]; then
  CONFIG="artifacts/trades-template/src/config.ts"
else
  echo "❌ Could not find config.ts (looked in src/ and artifacts/trades-template/src/)"
  exit 1
fi

EMAIL_EMPTY=$(grep -cE '^\s*email:\s*""\s*,?\s*$' "$CONFIG" || true)
PITCH_TRUE=$(grep -cE '^export const PITCH_MODE\s*=\s*true' "$CONFIG" || true)
NAME_PLACEHOLDER=$(grep -cE 'name:\s*"\[Business Name\]"' "$CONFIG" || true)

if [ "$EMAIL_EMPTY" -gt 0 ] && [ "$PITCH_TRUE" -eq 0 ]; then
  echo ""
  echo "❌ BUILD BLOCKED — config check failed"
  echo ""
  echo "   $CONFIG has:"
  echo "     BUSINESS.email = \"\"   (empty)"
  echo "     PITCH_MODE     = false"
  echo ""
  echo "   This combination would silently route every form submission"
  echo "   to the default fallback (teddy.nk28@gmail.com) — likely not"
  echo "   what you want for a real client launch."
  echo ""
  echo "   Fix one of these:"
  echo "     A) Set BUSINESS.email to the client's recipient address"
  echo "     B) Set PITCH_MODE = true (design pitch with no backend)"
  echo ""
  echo "   Override (use sparingly): SKIP_CONFIG_CHECK=1 pnpm build"
  echo ""
  exit 1
fi

if [ "$NAME_PLACEHOLDER" -gt 0 ] && [ "$PITCH_TRUE" -eq 0 ]; then
  echo ""
  echo "⚠ BUILD WARNING — BUSINESS.name still '[Business Name]'"
  echo "  You probably forgot to customize config.ts for this client."
  echo "  Override: SKIP_CONFIG_CHECK=1 pnpm build"
  echo ""
  exit 1
fi

echo "✓ Config check passed (email is set or PITCH_MODE=true)"
