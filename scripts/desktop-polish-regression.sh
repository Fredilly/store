#!/usr/bin/env bash
set -euo pipefail

CSS="app/globals.css"

grep -q 'Desktop-only polish. Mobile/tablet rules above remain unchanged.' "$CSS"
grep -q '@media (min-width: 900px)' "$CSS"
grep -q 'width: min(100%, 1040px)' "$CSS"
grep -q 'grid-template-columns: repeat(3, minmax(0, 1fr))' "$CSS"
grep -q 'grid-template-columns: repeat(4, minmax(0, 1fr))' "$CSS"
grep -q 'width: min(100%, 1120px)' "$CSS"
grep -q '@media (min-width: 900px) and (hover: hover) and (pointer: fine)' "$CSS"

DESKTOP_LINE=$(grep -n 'Desktop-only polish. Mobile/tablet rules above remain unchanged.' "$CSS" | cut -d: -f1)
LAST_MOBILE_LINE=$(grep -n '@media (max-width:' "$CSS" | tail -1 | cut -d: -f1)

if [ "$DESKTOP_LINE" -le "$LAST_MOBILE_LINE" ]; then
  echo "FAIL: desktop polish must remain after all mobile overrides"
  exit 1
fi

echo "PASS: desktop-only polish boundary"
