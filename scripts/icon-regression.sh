#!/usr/bin/env bash
set -euo pipefail

ICON="components/Icon.tsx"
HOME="app/page.tsx"
SCANNER="components/BarcodeScanner.tsx"

for name in home sell stockIn stock money activity camera; do
  grep -q ""$name"" "$ICON" || { echo "FAIL: missing icon $name"; exit 1; }
done

grep -q 'className="actionIcon"' "$HOME" || { echo "FAIL: home actions do not render icons"; exit 1; }
grep -q 'name="camera"' "$SCANNER" || { echo "FAIL: barcode scanner missing camera icon"; exit 1; }

for page in app/stock/page.tsx app/sell/page.tsx app/inventory/page.tsx app/money/page.tsx; do
  grep -q 'name="home"' "$page" || { echo "FAIL: $page missing home icon"; exit 1; }
done

if grep -q 'lucide\|heroicons\|react-icons' package.json; then
  echo "FAIL: icon pass added an external icon dependency"
  exit 1
fi

echo "PASS: minimalist icon acceptance"
