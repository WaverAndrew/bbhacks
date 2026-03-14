#!/usr/bin/env bash
# Quick API smoke test. Run with backend up: ./scripts/smoke-test-api.sh
# Or: bash scripts/smoke-test-api.sh

set -e
API="${API_URL:-http://localhost:4000}"

echo "Smoke testing API at $API ..."

curl -sf "$API/health" | grep -q '"status":"ok"' && echo "  GET /health OK" || { echo "  GET /health FAIL"; exit 1; }
curl -sf "$API/lp/vault" > /dev/null && echo "  GET /lp/vault OK" || { echo "  GET /lp/vault FAIL"; exit 1; }

QUOTE=$(curl -sf -X POST "$API/coverage/quote" \
  -H "Content-Type: application/json" \
  -d '{"insuredAmount":"1000","startDate":"2025-01-01","endDate":"2025-02-01"}')
echo "$QUOTE" | grep -q '"premium"' && echo "  POST /coverage/quote OK" || { echo "  POST /coverage/quote FAIL"; exit 1; }

curl -sf "$API/oracle/voyages" > /dev/null && echo "  GET /oracle/voyages OK" || { echo "  GET /oracle/voyages FAIL"; exit 1; }

echo "Smoke test passed."
