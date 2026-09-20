#!/usr/bin/env bash
set -euo pipefail

DB="store-db"

run_sql() {
  npx wrangler d1 execute "$DB" --local --command "$1" >/tmp/core-regression-last.log 2>&1
}

expect_blocked() {
  local label="$1"
  local sql="$2"

  set +e
  npx wrangler d1 execute "$DB" --local --command "$sql" >/tmp/core-regression-blocked.log 2>&1
  local status=$?
  set -e

  echo "=== $label ==="
  cat /tmp/core-regression-blocked.log

  if [ "$status" -eq 0 ]; then
    echo "FAIL: $label was allowed"
    exit 1
  fi
}

query_json() {
  npx wrangler d1 execute "$DB" --local --json --command "$1"
}

echo "Seeding isolated acceptance fixture..."

run_sql "
  INSERT INTO organizations (id, name, currency)
  VALUES
    ('qa_org_a', 'QA School A', 'NGN'),
    ('qa_org_b', 'QA School B', 'NGN');

  INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt)
  VALUES
    ('qa_owner_a', 'Owner A', 'owner-a@example.com', 1, 1, 1),
    ('qa_staff_a', 'Staff A', 'staff-a@example.com', 1, 1, 1),
    ('qa_owner_b', 'Owner B', 'owner-b@example.com', 1, 1, 1);

  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES
    ('qa_org_a', 'qa_owner_a', 'OWNER', 'ACTIVE'),
    ('qa_org_a', 'qa_staff_a', 'STAFF', 'ACTIVE'),
    ('qa_org_b', 'qa_owner_b', 'OWNER', 'ACTIVE');

  INSERT INTO products (id, organization_id, name)
  VALUES
    ('qa_product_a', 'qa_org_a', 'Book A'),
    ('qa_product_b', 'qa_org_b', 'Book B');

  INSERT INTO product_variants (
    id, organization_id, product_id, variant_name, selling_price_minor
  )
  VALUES
    ('qa_variant_a', 'qa_org_a', 'qa_product_a', 'Default', 1000),
    ('qa_variant_b', 'qa_org_b', 'qa_product_b', 'Default', 2000);

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, created_by_user_id
  )
  VALUES (
    'qa_receive_a', 'qa_org_a', 'qa_variant_a', 'RECEIVE',
    10, 'qa_owner_a'
  );

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type,
    entity_type, entity_id, metadata_json
  )
  VALUES (
    'qa_audit_receive', 'qa_org_a', 'qa_owner_a',
    'STOCK_RECEIVED', 'stock_movement', 'qa_receive_a', '{}'
  );

  INSERT INTO sales (
    id, organization_id, total_minor, created_by_user_id, submission_key
  )
  VALUES (
    'qa_sale_a', 'qa_org_a', 3000, 'qa_staff_a', 'qa-sale-key'
  );

  INSERT INTO sale_items (
    id, organization_id, sale_id, product_variant_id,
    quantity, unit_price_minor, line_total_minor
  )
  VALUES (
    'qa_sale_item_a', 'qa_org_a', 'qa_sale_a', 'qa_variant_a',
    3, 1000, 3000
  );

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, related_sale_id, created_by_user_id
  )
  VALUES (
    'qa_sale_movement_a', 'qa_org_a', 'qa_variant_a', 'SALE',
    -3, 'qa_sale_a', 'qa_staff_a'
  );

  INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  )
  VALUES (
    'qa_payment_1', 'qa_org_a', 'qa_sale_a', 1000,
    'qa_owner_a', 'qa-pay-key-1'
  );

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type,
    entity_type, entity_id, metadata_json
  )
  VALUES (
    'qa_audit_sale', 'qa_org_a', 'qa_staff_a',
    'SALE_CREATED', 'sale', 'qa_sale_a', '{}'
  );
"

echo "Checking happy-path ledger math..."

STATE=$(query_json "
  SELECT
    (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM stock_movements
      WHERE organization_id = 'qa_org_a'
        AND product_variant_id = 'qa_variant_a'
    ) AS stock_remaining,
    (
      SELECT COALESCE(SUM(amount_minor), 0)
      FROM payments
      WHERE organization_id = 'qa_org_a'
        AND sale_id = 'qa_sale_a'
    ) AS paid_minor,
    (
      SELECT COUNT(*)
      FROM audit_events
      WHERE organization_id = 'qa_org_a'
        AND id IN ('qa_audit_receive', 'qa_audit_sale')
    ) AS audit_count;
")

echo "$STATE"

grep -Eq '"stock_remaining"[[:space:]]*:[[:space:]]*7' <<<"$STATE" || {
  echo "FAIL: sale did not reduce stock to 7"
  exit 1
}

grep -Eq '"paid_minor"[[:space:]]*:[[:space:]]*1000' <<<"$STATE" || {
  echo "FAIL: partial payment was not recorded"
  exit 1
}

grep -Eq '"audit_count"[[:space:]]*:[[:space:]]*2' <<<"$STATE" || {
  echo "FAIL: expected audit events were not written"
  exit 1
}

echo "Checking additional payment..."
run_sql "
  INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  )
  VALUES (
    'qa_payment_2', 'qa_org_a', 'qa_sale_a', 1500,
    'qa_owner_a', 'qa-pay-key-2'
  );
"

STATE=$(query_json "
  SELECT COALESCE(SUM(amount_minor), 0) AS paid_minor
  FROM payments
  WHERE organization_id = 'qa_org_a'
    AND sale_id = 'qa_sale_a';
")
echo "$STATE"

grep -Eq '"paid_minor"[[:space:]]*:[[:space:]]*2500' <<<"$STATE" || {
  echo "FAIL: additional payment was not accumulated"
  exit 1
}

expect_blocked   "overpayment"   "INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  ) VALUES (
    'qa_payment_over', 'qa_org_a', 'qa_sale_a', 600,
    'qa_owner_a', 'qa-pay-key-over'
  );"

expect_blocked   "insufficient stock"   "INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, created_by_user_id
  ) VALUES (
    'qa_overdraw_stock', 'qa_org_a', 'qa_variant_a',
    'SALE', -8, 'qa_staff_a'
  );"

expect_blocked   "cross-school sale item"   "INSERT INTO sale_items (
    id, organization_id, sale_id, product_variant_id,
    quantity, unit_price_minor, line_total_minor
  ) VALUES (
    'qa_cross_item', 'qa_org_a', 'qa_sale_a', 'qa_variant_b',
    1, 2000, 2000
  );"

expect_blocked   "cross-school payment"   "INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  ) VALUES (
    'qa_cross_payment', 'qa_org_b', 'qa_sale_a', 100,
    'qa_owner_b', 'qa-cross-pay'
  );"

expect_blocked   "duplicate sale submission"   "INSERT INTO sales (
    id, organization_id, total_minor, created_by_user_id, submission_key
  ) VALUES (
    'qa_sale_duplicate', 'qa_org_a', 1000,
    'qa_staff_a', 'qa-sale-key'
  );"

expect_blocked   "duplicate payment submission"   "INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  ) VALUES (
    'qa_payment_duplicate', 'qa_org_a', 'qa_sale_a', 100,
    'qa_owner_a', 'qa-pay-key-1'
  );"

expect_blocked   "audit deletion"   "DELETE FROM audit_events WHERE id = 'qa_audit_sale';"

echo "Checking preserved state after rejected writes..."

FINAL=$(query_json "
  SELECT
    (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM stock_movements
      WHERE organization_id = 'qa_org_a'
        AND product_variant_id = 'qa_variant_a'
    ) AS stock_remaining,
    (
      SELECT COALESCE(SUM(amount_minor), 0)
      FROM payments
      WHERE organization_id = 'qa_org_a'
        AND sale_id = 'qa_sale_a'
    ) AS paid_minor,
    (
      SELECT COUNT(*)
      FROM sales
      WHERE organization_id = 'qa_org_a'
        AND submission_key = 'qa-sale-key'
    ) AS sale_submission_count,
    (
      SELECT COUNT(*)
      FROM payments
      WHERE organization_id = 'qa_org_a'
        AND submission_key = 'qa-pay-key-1'
    ) AS payment_submission_count,
    (
      SELECT COUNT(*)
      FROM audit_events
      WHERE id = 'qa_audit_sale'
    ) AS audit_preserved;
")

echo "$FINAL"

grep -Eq '"stock_remaining"[[:space:]]*:[[:space:]]*7' <<<"$FINAL" || exit 1
grep -Eq '"paid_minor"[[:space:]]*:[[:space:]]*2500' <<<"$FINAL" || exit 1
grep -Eq '"sale_submission_count"[[:space:]]*:[[:space:]]*1' <<<"$FINAL" || exit 1
grep -Eq '"payment_submission_count"[[:space:]]*:[[:space:]]*1' <<<"$FINAL" || exit 1
grep -Eq '"audit_preserved"[[:space:]]*:[[:space:]]*1' <<<"$FINAL" || exit 1

echo "PASS: core ledger regression suite"
