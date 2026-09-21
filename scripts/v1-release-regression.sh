#!/usr/bin/env bash
set -euo pipefail

DB="store-db"

run_sql() {
  npx wrangler d1 execute "$DB" --local --command "$1" >/tmp/v1-release-last.log 2>&1 || {
    cat /tmp/v1-release-last.log
    exit 1
  }
}

query_json() {
  npx wrangler d1 execute "$DB" --local --json --command "$1"
}

echo "Seeding V1 end-to-end fixture..."

run_sql "
  INSERT INTO organizations (id, name, currency)
  VALUES
    ('v1_org', 'V1 School', 'NGN'),
    ('v1_other_org', 'Other School', 'NGN');

  INSERT INTO \"user\" (id, name, email, emailVerified, createdAt, updatedAt)
  VALUES
    ('v1_owner', 'V1 Owner', 'v1-owner@example.invalid', 1, 1, 1),
    ('v1_staff', 'V1 Staff', 'v1-staff@example.invalid', 1, 1, 1),
    ('v1_other_owner', 'Other Owner', 'v1-other@example.invalid', 1, 1, 1);

  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES
    ('v1_org', 'v1_owner', 'OWNER', 'ACTIVE'),
    ('v1_org', 'v1_staff', 'STAFF', 'ACTIVE'),
    ('v1_other_org', 'v1_other_owner', 'OWNER', 'ACTIVE');

  INSERT INTO products (id, organization_id, name, category)
  VALUES
    ('v1_product', 'v1_org', 'English Textbook', 'Books'),
    ('v1_other_product', 'v1_other_org', 'OTHER_SCHOOL_ONLY', 'Books');

  INSERT INTO product_variants (
    id, organization_id, product_id, variant_name, selling_price_minor
  )
  VALUES
    ('v1_variant', 'v1_org', 'v1_product', 'JSS 1', 5000),
    ('v1_other_variant', 'v1_other_org', 'v1_other_product', 'Default', 9000);

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, created_by_user_id
  )
  VALUES
    ('v1_receive', 'v1_org', 'v1_variant', 'RECEIVE', 20, 'v1_owner'),
    ('v1_other_receive', 'v1_other_org', 'v1_other_variant', 'RECEIVE', 99, 'v1_other_owner');

  INSERT INTO sales (
    id, organization_id, customer_name, total_minor, created_by_user_id, submission_key
  )
  VALUES (
    'v1_sale', 'v1_org', 'Parent A', 10000, 'v1_staff', 'v1-sale-key'
  );

  INSERT INTO sale_items (
    id, organization_id, sale_id, product_variant_id,
    quantity, unit_price_minor, line_total_minor
  )
  VALUES (
    'v1_sale_item', 'v1_org', 'v1_sale', 'v1_variant',
    2, 5000, 10000
  );

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type,
    quantity_delta, related_sale_id, created_by_user_id
  )
  VALUES (
    'v1_sale_move', 'v1_org', 'v1_variant', 'SALE',
    -2, 'v1_sale', 'v1_staff'
  );

  INSERT INTO payments (
    id, organization_id, sale_id, amount_minor,
    received_by_user_id, submission_key
  )
  VALUES (
    'v1_payment', 'v1_org', 'v1_sale', 6000,
    'v1_owner', 'v1-pay-key'
  );

  INSERT INTO expenses (
    id, organization_id, description, amount_minor, created_by_user_id
  )
  VALUES (
    'v1_expense', 'v1_org', 'Transport', 1500, 'v1_owner'
  );

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type,
    entity_type, entity_id, metadata_json
  )
  VALUES
    ('v1_audit_stock', 'v1_org', 'v1_owner', 'STOCK_RECEIVED', 'stock_movement', 'v1_receive', '{}'),
    ('v1_audit_sale', 'v1_org', 'v1_staff', 'SALE_CREATED', 'sale', 'v1_sale', '{}'),
    ('v1_audit_payment', 'v1_org', 'v1_owner', 'PAYMENT_RECORDED', 'payment', 'v1_payment', '{}'),
    ('v1_audit_expense', 'v1_org', 'v1_owner', 'EXPENSE_RECORDED', 'expense', 'v1_expense', '{}');
"

echo "Checking stock, money, outstanding, expense, actors, and isolation..."

STATE=$(query_json "
  SELECT
    (
      SELECT COALESCE(SUM(quantity_delta), 0)
      FROM stock_movements
      WHERE organization_id = 'v1_org'
        AND product_variant_id = 'v1_variant'
    ) AS stock,
    (
      SELECT COALESCE(SUM(total_minor), 0)
      FROM sales
      WHERE organization_id = 'v1_org'
        AND status = 'COMPLETED'
    ) AS sold,
    (
      SELECT COALESCE(SUM(amount_minor), 0)
      FROM payments
      WHERE organization_id = 'v1_org'
    ) AS received,
    (
      SELECT COALESCE(SUM(amount_minor), 0)
      FROM expenses
      WHERE organization_id = 'v1_org'
    ) AS expenses,
    (
      SELECT
        COALESCE((SELECT SUM(total_minor) FROM sales WHERE organization_id = 'v1_org' AND status = 'COMPLETED'), 0)
        - COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = 'v1_org'), 0)
    ) AS outstanding,
    (
      SELECT COUNT(*)
      FROM audit_events
      WHERE organization_id = 'v1_org'
        AND actor_user_id IN ('v1_owner', 'v1_staff')
    ) AS audit_count,
    (
      SELECT COUNT(*)
      FROM products
      WHERE organization_id = 'v1_org'
        AND name = 'OTHER_SCHOOL_ONLY'
    ) AS leaked_products;
")

echo "$STATE"

grep -Eq '"stock"[[:space:]]*:[[:space:]]*18' <<<"$STATE" || { echo "FAIL: stock should be 18"; exit 1; }
grep -Eq '"sold"[[:space:]]*:[[:space:]]*10000' <<<"$STATE" || { echo "FAIL: sold total should be 10000"; exit 1; }
grep -Eq '"received"[[:space:]]*:[[:space:]]*6000' <<<"$STATE" || { echo "FAIL: received should be 6000"; exit 1; }
grep -Eq '"expenses"[[:space:]]*:[[:space:]]*1500' <<<"$STATE" || { echo "FAIL: expenses should be 1500"; exit 1; }
grep -Eq '"outstanding"[[:space:]]*:[[:space:]]*4000' <<<"$STATE" || { echo "FAIL: outstanding should be 4000"; exit 1; }
grep -Eq '"audit_count"[[:space:]]*:[[:space:]]*4' <<<"$STATE" || { echo "FAIL: audit trail incomplete"; exit 1; }
grep -Eq '"leaked_products"[[:space:]]*:[[:space:]]*0' <<<"$STATE" || { echo "FAIL: tenant isolation leak"; exit 1; }

echo "Checking append-only correction..."

run_sql "
  INSERT INTO payment_adjustments (
    id, organization_id, sale_id, related_payment_id,
    amount_delta_minor, reason, created_by_user_id
  )
  VALUES (
    'v1_adjustment', 'v1_org', 'v1_sale', 'v1_payment',
    -1000, 'Payment entered too high', 'v1_owner'
  );

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type,
    entity_type, entity_id, metadata_json
  )
  VALUES (
    'v1_audit_adjustment', 'v1_org', 'v1_owner',
    'PAYMENT_CORRECTED', 'sale', 'v1_sale', '{}'
  );
"

CORRECTED=$(query_json "
  SELECT
    (
      COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = 'v1_org'), 0)
      + COALESCE((SELECT SUM(amount_delta_minor) FROM payment_adjustments WHERE organization_id = 'v1_org'), 0)
    ) AS effective_received,
    (
      SELECT COUNT(*) FROM payments WHERE id = 'v1_payment' AND amount_minor = 6000
    ) AS original_payment_preserved,
    (
      SELECT COUNT(*) FROM audit_events WHERE id = 'v1_audit_adjustment'
    ) AS correction_audited;
")

echo "$CORRECTED"

grep -Eq '"effective_received"[[:space:]]*:[[:space:]]*5000' <<<"$CORRECTED" || { echo "FAIL: corrected received should be 5000"; exit 1; }
grep -Eq '"original_payment_preserved"[[:space:]]*:[[:space:]]*1' <<<"$CORRECTED" || { echo "FAIL: original payment was altered"; exit 1; }
grep -Eq '"correction_audited"[[:space:]]*:[[:space:]]*1' <<<"$CORRECTED" || { echo "FAIL: correction not audited"; exit 1; }

echo "PASS: V1 release ledger scenario"
