#!/usr/bin/env bash
# Compare Polymarket CLOB price with our backend. Run from repo root; backend should be up.
TOKEN_ID="${1:-34522029811885165268273792456913474420221035255265728336691773789337117326368}"
BACKEND="${2:-http://localhost:4000}"

echo "Token ID: ${TOKEN_ID:0:20}..."
echo ""

echo "1. Polymarket CLOB (direct):"
POLY=$(curl -s "https://clob.polymarket.com/price?token_id=${TOKEN_ID}&side=BUY")
echo "   $POLY"
P=$(echo "$POLY" | sed -n 's/.*"price":"\([^"]*\)".*/\1/p')
[ -n "$P" ] && echo "   → $P"
echo ""

echo "2. Backend /coverage/market-price:"
BACK=$(curl -s "${BACKEND}/coverage/market-price?marketId=${TOKEN_ID}")
echo "   $BACK"
B=$(echo "$BACK" | sed -n 's/.*"price":\([0-9.]*\).*/\1/p')
[ -n "$B" ] && echo "   → $B"
echo ""

if [ -n "$P" ] && [ -n "$B" ]; then
  if [ "$P" = "$B" ]; then
    echo "   Match: Polymarket and backend both return $P"
  else
    echo "   Mismatch: CLOB=$P, backend=$B"
  fi
fi
