#!/usr/bin/env bash
set -euo pipefail

HOME="app/page.tsx"
SCANNER="components/BarcodeScanner.tsx"
CSS="app/globals.css"

grep -q 'className="actionTitle"' "$HOME" || { echo "FAIL: action title/icon row missing"; exit 1; }
grep -q 'size={30}' "$HOME" || { echo "FAIL: home icons are not enlarged"; exit 1; }
grep -q 'size={29}' "$SCANNER" || { echo "FAIL: camera icon is not enlarged"; exit 1; }
grep -q 'color: #15171a;' "$CSS" || { echo "FAIL: home icons do not use high-contrast color"; exit 1; }
grep -q 'font-size: 1.18rem;' "$CSS" || { echo "FAIL: scan barcode text is not enlarged"; exit 1; }
grep -q 'min-height: 64px;' "$CSS" || { echo "FAIL: scan barcode button is not prominent enough"; exit 1; }

echo "PASS: icon visibility and barcode emphasis acceptance"
