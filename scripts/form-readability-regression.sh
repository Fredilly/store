#!/usr/bin/env bash
set -euo pipefail

CSS="app/globals.css"

grep -q 'font-size: 1.15rem;' "$CSS" || { echo "FAIL: internal form labels are not enlarged"; exit 1; }
grep -q 'font-size: 1.125rem;' "$CSS" || { echo "FAIL: form control text is not enlarged"; exit 1; }
grep -q 'font-size: 1.18rem;' "$CSS" || { echo "FAIL: mobile label size override missing"; exit 1; }

echo "PASS: internal form readability acceptance"
