#!/usr/bin/env bash
set -euo pipefail

ROUTE="app/api/products/route.ts"
PAGE="app/stock/page.tsx"

grep -q 'name="starting_stock"' "$PAGE" || {
  echo "FAIL: new item form is missing starting stock"
  exit 1
}

grep -q 'name="cost_price"' "$PAGE" || {
  echo "FAIL: new item form is missing optional cost price"
  exit 1
}

grep -q 'name="barcode"' "$PAGE" || {
  echo "FAIL: new item form is missing barcode"
  exit 1
}

grep -q 'startingStock > 0' "$ROUTE" || {
  echo "FAIL: product creation does not handle starting stock"
  exit 1
}

grep -q "'STOCK_RECEIVED'" "$ROUTE" || {
  echo "FAIL: starting stock is not audited"
  exit 1
}

grep -q "'PRODUCT_CREATED'" "$ROUTE" || {
  echo "FAIL: product creation is not audited"
  exit 1
}

grep -q 'database.batch(statements)' "$ROUTE" || {
  echo "FAIL: product setup is not committed as one D1 batch"
  exit 1
}

if grep -q 'Category, optional' "$PAGE"; then
  echo "FAIL: category jargon remains in the primary create-item UI"
  exit 1
fi

echo "PASS: simple product setup acceptance"
