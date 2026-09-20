#!/usr/bin/env bash
set -euo pipefail

EMAIL="lib/email.ts"

grep -q 'Welcome to School Ledger — your account is ready' "$EMAIL" || { echo "FAIL: welcome subject not polished"; exit 1; }
grep -q 'Add your first item' "$EMAIL" || { echo "FAIL: welcome CTA missing"; exit 1; }
grep -q 'safely ignore this email' "$EMAIL" || { echo "FAIL: reset security copy missing"; exit 1; }
grep -q "You're invited to join" "$EMAIL" || { echo "FAIL: staff invite subject not polished"; exit 1; }
grep -q 'Join ${safeOrganization}' "$EMAIL" || { echo "FAIL: staff invite CTA missing"; exit 1; }
grep -q 'record sales, add stock, and see what is in stock' "$EMAIL" || { echo "FAIL: staff permissions copy not plain-language"; exit 1; }

echo "PASS: transactional email copy acceptance"
