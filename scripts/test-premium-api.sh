#!/usr/bin/env bash
# Test that the backend premium endpoint returns the Polymarket-driven premium.
# Run with: ./scripts/test-premium-api.sh
# Backend must be running: cd backend && npm run dev

set -e
API="${API_URL:-http://localhost:4000}"
TOKEN_ID="34522029811885165268273792456913474420221035255265728336691773789337117326368"

echo "Testing GET $API/coverage/premium?marketId=...&insuredAmount=50000"
res=$(curl -s -w "\n%{http_code}" "$API/coverage/premium?marketId=$TOKEN_ID&insuredAmount=50000")
body=$(echo "$res" | head -n -1)
code=$(echo "$res" | tail -n 1)

if [ "$code" != "200" ]; then
  echo "FAIL: HTTP $code"
  echo "$body"
  exit 1
fi

premium=$(echo "$body" | grep -o '"premium":"[^"]*"' | cut -d'"' -f4)
source=$(echo "$body" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)

echo "OK: premium=$premium source=$source"
if [ "$source" = "polymarket" ]; then
  echo "Live premium from Polymarket is working (expected ~18500 for 50k at 0.37)."
else
  echo "WARN: Backend returned fallback (2%). Check that CLOB price parsing and token ID are correct."
fi
