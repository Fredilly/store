#!/usr/bin/env bash
set -euo pipefail

DB="store-db"

run_sql() {
  if ! npx wrangler d1 execute "$DB" --local --command "$1" >/tmp/corrections-regression.log 2>&1; then
    cat /tmp/corrections-regression.log
    return 1
  fi
}

query_json() {
  npx wrangler d1 execute "$DB" --local --json --command "$1"
}

expect_blocked() {
  local label="$1"
  local sql="$2"
  set +e
  npx wrangler d1 execute "$DB" --local --command "$sql" >/tmp/corrections-blocked.log 2>&1
  local status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    echo "FAIL: $label was allowed"
    exit 1
  fi
}

echo "Seeding correction fixture..."
run_sql "
  INSERT INTO organizations (id, name, currency)
  VALUES ('qa_corrections_org', 'Corrections School', 'NGN');

  INSERT INTO products (id, organization_id, name)
  VALUES ('qa_corr_product', 'qa_corrections_org', 'Uniform');

  INSERT INTO product_variants (id, organization_id, product_id, variant_name, selling_price_minor)
  VALUES ('qa_corr_variant', 'qa_corrections_org', 'qa_corr_product', 'Size 10', 1000);

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type, quantity_delta, created_by_user_id
  ) VALUES (
    'qa_corr_receive', 'qa_corrections_org', 'qa_corr_variant', 'RECEIVE', 10, 'qa_owner'
  );

  INSERT INTO sales (
    id, organization_id, total_minor, created_by_user_id, submission_key
  ) VALUES (
    'qa_corr_sale', 'qa_corrections_org', 3000, 'qa_owner', 'qa-corr-sale'
  );

  INSERT INTO sale_items (
    id, organization_id, sale_id, product_variant_id, quantity, unit_price_minor, line_total_minor
  ) VALUES (
    'qa_corr_item', 'qa_corrections_org', 'qa_corr_sale', 'qa_corr_variant', 3, 1000, 3000
  );

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type, quantity_delta, related_sale_id, created_by_user_id
  ) VALUES (
    'qa_corr_sale_move', 'qa_corrections_org', 'qa_corr_variant', 'SALE', -3, 'qa_corr_sale', 'qa_owner'
  );

  INSERT INTO payments (
    id, organization_id, sale_id, amount_minor, received_by_user_id, submission_key
  ) VALUES (
    'qa_corr_payment', 'qa_corrections_org', 'qa_corr_sale', 1000, 'qa_owner', 'qa-corr-pay'
  );
"

BEFORE=$(query_json "
  SELECT
    (SELECT COALESCE(SUM(quantity_delta), 0) FROM stock_movements WHERE organization_id = 'qa_corrections_org') AS stock,
    (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE organization_id = 'qa_corrections_org') AS received;
")
echo "$BEFORE"
grep -Eq '"stock"[[:space:]]*:[[:space:]]*7' <<<"$BEFORE" || exit 1
grep -Eq '"received"[[:space:]]*:[[:space:]]*1000' <<<"$BEFORE" || exit 1

echo "Applying append-only sale void..."
run_sql "
  UPDATE sales
  SET status = 'VOIDED', voided_at = CURRENT_TIMESTAMP
  WHERE id = 'qa_corr_sale' AND organization_id = 'qa_corrections_org';

  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type, quantity_delta,
    related_sale_id, reason, created_by_user_id
  ) VALUES (
    'qa_corr_void_move', 'qa_corrections_org', 'qa_corr_variant', 'VOID_REVERSAL', 3,
    'qa_corr_sale', 'Entered by mistake', 'qa_owner'
  );

  INSERT INTO payment_adjustments (
    id, organization_id, sale_id, amount_delta_minor, reason, created_by_user_id
  ) VALUES (
    'qa_corr_money_reverse', 'qa_corrections_org', 'qa_corr_sale', -1000,
    'Sale voided: Entered by mistake', 'qa_owner'
  );

  INSERT INTO audit_events (
    id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json
  ) VALUES (
    'qa_corr_audit', 'qa_corrections_org', 'qa_owner', 'SALE_VOIDED', 'sale',
    'qa_corr_sale', '{}'
  );
"

AFTER=$(query_json "
  SELECT
    (SELECT status FROM sales WHERE id = 'qa_corr_sale') AS status,
    (SELECT COALESCE(SUM(quantity_delta), 0) FROM stock_movements WHERE organization_id = 'qa_corrections_org') AS stock,
    (
      SELECT COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = 'qa_corrections_org'), 0)
      + COALESCE((SELECT SUM(amount_delta_minor) FROM payment_adjustments WHERE organization_id = 'qa_corrections_org'), 0)
    ) AS received,
    (SELECT COUNT(*) FROM audit_events WHERE id = 'qa_corr_audit') AS audit_count;
")
echo "$AFTER"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"VOIDED"' <<<"$AFTER" || exit 1
grep -Eq '"stock"[[:space:]]*:[[:space:]]*10' <<<"$AFTER" || exit 1
grep -Eq '"received"[[:space:]]*:[[:space:]]*0' <<<"$AFTER" || exit 1
grep -Eq '"audit_count"[[:space:]]*:[[:space:]]*1' <<<"$AFTER" || exit 1

expect_blocked "payment adjustment update"   "UPDATE payment_adjustments SET amount_delta_minor = -500 WHERE id = 'qa_corr_money_reverse';"
expect_blocked "payment adjustment delete"   "DELETE FROM payment_adjustments WHERE id = 'qa_corr_money_reverse';"

echo "Checking damage correction..."
run_sql "
  INSERT INTO stock_movements (
    id, organization_id, product_variant_id, movement_type, quantity_delta, reason, created_by_user_id
  ) VALUES (
    'qa_corr_damage', 'qa_corrections_org', 'qa_corr_variant', 'DAMAGE', -2, 'Damaged', 'qa_owner'
  );
"

DAMAGE=$(query_json "
  SELECT COALESCE(SUM(quantity_delta), 0) AS stock
  FROM stock_movements
  WHERE organization_id = 'qa_corrections_org'
    AND product_variant_id = 'qa_corr_variant';
")
echo "$DAMAGE"
grep -Eq '"stock"[[:space:]]*:[[:space:]]*8' <<<"$DAMAGE" || exit 1

echo "PASS: corrections and void ledger regression suite"
