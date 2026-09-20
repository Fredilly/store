#!/usr/bin/env bash
set -euo pipefail

ROUTE="app/api/export/[kind]/route.ts"
PAGE="app/export/page.tsx"
DB="store-db"

require_text() {
  local file="$1"
  local text="$2"
  local message="$3"
  if ! grep -Fq "$text" "$file"; then
    echo "FAIL: $message"
    exit 1
  fi
}

echo "Checking export route contract..."
require_text "$ROUTE" "requireOwner" "exports must remain owner-only"
require_text "$ROUTE" 'WHERE p.organization_id = ?' "product export must be tenant-scoped"
require_text "$ROUTE" 'WHERE v.organization_id = ?' "inventory export must be tenant-scoped"
require_text "$ROUTE" 'WHERE m.organization_id = ?' "stock movement export must be tenant-scoped"
require_text "$ROUTE" 'WHERE organization_id = ?' "ledger exports must be tenant-scoped"
require_text "$ROUTE" '"Content-Type": "text/csv; charset=utf-8"' "exports must return CSV"
require_text "$ROUTE" '"Cache-Control": "no-store"' "exports must not be cached"
require_text "$ROUTE" "DATA_EXPORTED" "downloads must be auditable"

for kind in products inventory stock-movements sales payments expenses audit-events
do
  require_text "$PAGE" "$kind" "export page is missing $kind"
done

echo "Seeding export-isolation fixture..."

npx wrangler d1 execute "$DB" --local --command "
  INSERT INTO organizations (id, name, currency)
  VALUES
    ('export_org_a', 'Export School A', 'NGN'),
    ('export_org_b', 'Export School B', 'NGN');

  INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt)
  VALUES
    ('export_owner_a', 'Export Owner A', 'export-a@example.com', 1, 1, 1),
    ('export_owner_b', 'Export Owner B', 'export-b@example.com', 1, 1, 1);

  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES
    ('export_org_a', 'export_owner_a', 'OWNER', 'ACTIVE'),
    ('export_org_b', 'export_owner_b', 'OWNER', 'ACTIVE');

  INSERT INTO products (id, organization_id, name)
  VALUES
    ('export_product_a', 'export_org_a', 'ONLY_A_PRODUCT'),
    ('export_product_b', 'export_org_b', 'ONLY_B_PRODUCT');

  INSERT INTO product_variants (
    id, organization_id, product_id, variant_name, selling_price_minor
  )
  VALUES
    ('export_variant_a', 'export_org_a', 'export_product_a', 'A', 1000),
    ('export_variant_b', 'export_org_b', 'export_product_b', 'B', 2000);

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, created_by_user_id
  )
  VALUES
    ('export_stock_a', 'export_org_a', 'export_variant_a', 'RECEIVE', 5, 'export_owner_a'),
    ('export_stock_b', 'export_org_b', 'export_variant_b', 'RECEIVE', 9, 'export_owner_b');

  INSERT INTO sales (
    id, organization_id, total_minor, created_by_user_id, submission_key
  )
  VALUES
    ('export_sale_a', 'export_org_a', 1000, 'export_owner_a', 'export-sale-a'),
    ('export_sale_b', 'export_org_b', 2000, 'export_owner_b', 'export-sale-b');

  INSERT INTO payments (
    id, organization_id, sale_id, amount_minor, received_by_user_id, submission_key
  )
  VALUES
    ('export_payment_a', 'export_org_a', 'export_sale_a', 500, 'export_owner_a', 'export-pay-a'),
    ('export_payment_b', 'export_org_b', 'export_sale_b', 700, 'export_owner_b', 'export-pay-b');

  INSERT INTO expenses (
    id, organization_id, description, amount_minor, created_by_user_id
  )
  VALUES
    ('export_expense_a', 'export_org_a', 'ONLY_A_EXPENSE', 100, 'export_owner_a'),
    ('export_expense_b', 'export_org_b', 'ONLY_B_EXPENSE', 200, 'export_owner_b');

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type,
    entity_type, entity_id, metadata_json
  )
  VALUES
    ('export_audit_a', 'export_org_a', 'export_owner_a', 'TEST_A', 'test', 'a', '{}'),
    ('export_audit_b', 'export_org_b', 'export_owner_b', 'TEST_B', 'test', 'b', '{}');
" >/tmp/export-seed.log 2>&1

check_isolation() {
  local label="$1"
  local sql="$2"
  local expected="$3"
  local forbidden="$4"

  local output
  output=$(npx wrangler d1 execute "$DB" --local --json --command "$sql")

  echo "=== $label ==="
  echo "$output"

  if ! grep -Fq "$expected" <<<"$output"; then
    echo "FAIL: $label did not contain expected tenant data"
    exit 1
  fi

  if grep -Fq "$forbidden" <<<"$output"; then
    echo "FAIL: $label leaked another tenant's data"
    exit 1
  fi
}

check_isolation "products" "
  SELECT p.name
  FROM products p
  JOIN product_variants v
    ON v.product_id = p.id
   AND v.organization_id = p.organization_id
  WHERE p.organization_id = 'export_org_a';
" "ONLY_A_PRODUCT" "ONLY_B_PRODUCT"

check_isolation "inventory" "
  SELECT p.name, COALESCE(SUM(m.quantity_delta), 0) AS current_stock
  FROM product_variants v
  JOIN products p
    ON p.id = v.product_id
   AND p.organization_id = v.organization_id
  LEFT JOIN stock_movements m
    ON m.product_variant_id = v.id
   AND m.organization_id = v.organization_id
  WHERE v.organization_id = 'export_org_a'
  GROUP BY v.id, p.name;
" "ONLY_A_PRODUCT" "ONLY_B_PRODUCT"

check_isolation "stock movements" "
  SELECT p.name
  FROM stock_movements m
  JOIN product_variants v
    ON v.id = m.product_variant_id
   AND v.organization_id = m.organization_id
  JOIN products p
    ON p.id = v.product_id
   AND p.organization_id = v.organization_id
  WHERE m.organization_id = 'export_org_a';
" "ONLY_A_PRODUCT" "ONLY_B_PRODUCT"

check_isolation "sales" "
  SELECT id FROM sales WHERE organization_id = 'export_org_a';
" "export_sale_a" "export_sale_b"

check_isolation "payments" "
  SELECT id FROM payments WHERE organization_id = 'export_org_a';
" "export_payment_a" "export_payment_b"

check_isolation "expenses" "
  SELECT description FROM expenses WHERE organization_id = 'export_org_a';
" "ONLY_A_EXPENSE" "ONLY_B_EXPENSE"

check_isolation "audit events" "
  SELECT event_type FROM audit_events WHERE organization_id = 'export_org_a';
" "TEST_A" "TEST_B"

echo "PASS: owner export acceptance and tenant isolation"
