#!/usr/bin/env bash
set -euo pipefail

CSS="app/globals.css"
HOME="app/page.tsx"
STOCK_VIEW="app/inventory/page.tsx"

grep -q 'body {' "$CSS" || { echo "FAIL: missing body readability rules"; exit 1; }
grep -q 'font-size: 18px;' "$CSS" || { echo "FAIL: mobile body text is not enlarged"; exit 1; }
grep -q 'min-height: 58px;' "$CSS" || { echo "FAIL: large tap/input targets missing"; exit 1; }
grep -q 'font-size: 1.0625rem;' "$CSS" || { echo "FAIL: form controls are not mobile-readable"; exit 1; }
grep -q 'grid-template-columns: 1fr;' "$CSS" || { echo "FAIL: narrow-screen summary is still cramped"; exit 1; }
grep -q 'prefers-reduced-motion' "$CSS" || { echo "FAIL: reduced-motion support missing"; exit 1; }
grep -q 'label: "Stock"' "$HOME" || { echo "FAIL: home still uses inventory jargon"; exit 1; }
grep -q '<p className="eyebrow">Stock</p>' "$STOCK_VIEW" || { echo "FAIL: stock view label not simplified"; exit 1; }
grep -q '<h1>What you have</h1>' "$STOCK_VIEW" || { echo "FAIL: stock view heading not simplified"; exit 1; }

echo "PASS: mobile readability acceptance"
