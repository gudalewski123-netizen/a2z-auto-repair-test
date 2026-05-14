#!/usr/bin/env bash
# Post-deploy smoke test. Confirms in <10 sec that:
#   1. Render backend is up and healthy
#   2. Vercel frontend serves
#   3. Vercel /api/* proxy reaches Render (the most common breakage)
#   4. Admin endpoint exists (returns 401 for wrong password — proves the
#      route is mounted, not just 404'd)
#
# Usage:
#   ./scripts/smoke-test.sh <render-url> <vercel-url>
# Example:
#   ./scripts/smoke-test.sh https://acme-roofing-api.onrender.com https://acmeroofing.com

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <render-url> <vercel-url>"
  echo "Example: $0 https://acme-roofing-api.onrender.com https://acmeroofing.com"
  exit 1
fi

RENDER_URL="${1%/}"   # strip trailing slash
VERCEL_URL="${2%/}"

PASS=0
FAIL=0
FAILURES=""

check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"

  printf "  %-40s " "$name"
  local result
  result=$(eval "$cmd" 2>&1 || echo "__ERROR__")
  if echo "$result" | grep -q "$expected"; then
    echo "✓"
    PASS=$((PASS+1))
  else
    echo "✗"
    FAILURES="$FAILURES\n  $name: expected '$expected'\n    got: $(echo "$result" | head -c 200)\n"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Smoke test"
echo "  Render:  $RENDER_URL"
echo "  Vercel:  $VERCEL_URL"
echo "═══════════════════════════════════════════════════════"

check "Render /api/healthz returns ok"      "curl -fsS '$RENDER_URL/api/healthz'"                  '"status":"ok"'
check "Vercel root loads (HTTP 200)"        "curl -fsSI '$VERCEL_URL' | head -1"                   "200"
check "Vercel /api proxy → Render"          "curl -fsS '$VERCEL_URL/api/healthz'"                  '"status":"ok"'
check "Admin route exists (not 404)"        "curl -s -o /dev/null -w '%{http_code}' -X POST '$RENDER_URL/api/admin/login' -H 'Content-Type: application/json' -d '{\"username\":\"smoketest\",\"password\":\"wrong\"}'"  "401"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════"

if [ $FAIL -gt 0 ]; then
  printf "$FAILURES"
  echo ""
  echo "Common causes for each failure:"
  echo "  • Render /healthz fails  → service still building (wait 2 min) or env vars missing"
  echo "  • Vercel 200 fails       → DNS still propagating or build failed"
  echo "  • Proxy /api fails       → vercel.json missing or wrong Render URL in rewrite"
  echo "  • Admin 401 fails        → backend didn't deploy this route OR admin auth misconfigured"
  exit 1
fi

echo "✅ All checks passed. Site is healthy."
