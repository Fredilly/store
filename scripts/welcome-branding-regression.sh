#!/usr/bin/env bash
set -euo pipefail

FORM="app/login/login-form.tsx"
BRAND="components/BrandMark.tsx"

grep -q 'Know what you have' "$FORM" || { echo "FAIL: welcome tagline missing"; exit 1; }
grep -q 'Record what you sell' "$FORM" || { echo "FAIL: welcome tagline incomplete"; exit 1; }
grep -q 'Start with your first item' "$FORM" || { echo "FAIL: guided signup copy missing"; exit 1; }
grep -q 'BrandMark' "$FORM" || { echo "FAIL: logo is not rendered"; exit 1; }
grep -q 'WelcomeArtwork' "$FORM" || { echo "FAIL: welcome artwork is not rendered"; exit 1; }
grep -q 'School Ledger' "$BRAND" || { echo "FAIL: brand wordmark missing"; exit 1; }

echo "PASS: welcome branding acceptance"
