#!/usr/bin/env bash
set -euo pipefail

grep -q 'Search item or category' components/item-picker.tsx
grep -q 'Low stock' components/item-picker.tsx
grep -q 'Out of stock' components/item-picker.tsx
grep -q 'InventoryBrowser' app/inventory/page.tsx
grep -q 'Search inventory' components/inventory-browser.tsx
grep -q 'low stock' components/inventory-browser.tsx
grep -q 'out of stock' components/inventory-browser.tsx
grep -q 'ItemPicker' app/sell/page.tsx
grep -q 'ItemPicker' app/stock/page.tsx
grep -q 'sale_count' lib/queries.ts
grep -q 'last_sold_at' lib/queries.ts

echo "PASS: item search and low-stock acceptance"
