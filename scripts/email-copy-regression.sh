#!/usr/bin/env bash
set -euo pipefail

EMAIL="lib/email.ts"

grep -q 'Welcome to School Ledger — your account is ready' "$EMAIL" || { echo "FAIL: welcome subject not polished"; exit 1; }
grep -q 'Add your first item' "$EMAIL" || { echo "FAIL: welcome CTA missing"; exit 1; }
grep -q 'safely ignore this email' "$EMAIL" || { echo "FAIL: reset security copy missing"; exit 1; }
grep -q "You're invited to join" "$EMAIL" || { echo "FAIL: staff invite subject not polished"; exit 1; }
grep -q 'Join ${safeOrganization}' "$EMAIL" || { echo "FAIL: staff invite CTA missing"; exit 1; }
grep -q 'record sales, add stock, and see what is in stock' "$EMAIL" || { echo "FAIL: staff permissions copy not plain-language"; exit 1; }

grep -q 'function emailLayout' "$EMAIL" || { echo "FAIL: shared email layout missing"; exit 1; }
grep -q '<!doctype html>' "$EMAIL" || { echo "FAIL: email HTML document wrapper missing"; exit 1; }
grep -q 'role="presentation"' "$EMAIL" || { echo "FAIL: email-safe table layout missing"; exit 1; }
grep -q 'max-width:600px' "$EMAIL" || { echo "FAIL: readable email width missing"; exit 1; }
grep -q 'display:none;max-height:0' "$EMAIL" || { echo "FAIL: inbox preview text missing"; exit 1; }
grep -q 'School Ledger · Keep stock, sales, and money records clear.' "$EMAIL" || { echo "FAIL: branded email footer missing"; exit 1; }

echo "PASS: transactional email copy and formatting acceptance"
