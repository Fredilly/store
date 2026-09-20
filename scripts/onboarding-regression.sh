#!/usr/bin/env bash
set -euo pipefail

PAGE="app/page.tsx"
QUERIES="lib/queries.ts"
PRODUCT_ROUTE="app/api/products/route.ts"
STOCK_PAGE="app/stock/page.tsx"

grep -q 'onboardingProgress' "$PAGE" || { echo "FAIL: home does not load onboarding progress"; exit 1; }
grep -q 'progress.saleCount === 0' "$PAGE" || { echo "FAIL: first-run mode is not tied to real sale state"; exit 1; }
grep -q 'Let’s add your first item' "$PAGE" || { echo "FAIL: missing first item nudge"; exit 1; }
grep -q 'Now add some stock' "$PAGE" || { echo "FAIL: missing stock nudge"; exit 1; }
grep -q 'You’re ready for your first sale' "$PAGE" || { echo "FAIL: missing first sale nudge"; exit 1; }
grep -q 'First sale recorded. You’re all set!' "$PAGE" || { echo "FAIL: missing first-sale congratulations"; exit 1; }
grep -q 'SELECT COUNT(\*) FROM product_variants' "$QUERIES" || { echo "FAIL: item progress is not database-derived"; exit 1; }
grep -q 'SELECT SUM(quantity_delta)' "$QUERIES" || { echo "FAIL: stock progress is not ledger-derived"; exit 1; }
grep -q 'SELECT COUNT(\*) FROM sales' "$QUERIES" || { echo "FAIL: sale progress is not database-derived"; exit 1; }
grep -q '/?success=item' "$PRODUCT_ROUTE" || { echo "FAIL: item creation does not return to guided home"; exit 1; }
grep -q 'id="new-item"' "$STOCK_PAGE" || { echo "FAIL: first-item nudge cannot target create form"; exit 1; }

echo "PASS: guided first-run acceptance"
