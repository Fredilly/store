-- Defense-in-depth for tenant consistency, stock integrity, and payment integrity.

CREATE TRIGGER IF NOT EXISTS enforce_stock_movement_tenant
BEFORE INSERT ON stock_movements
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM product_variants v
      WHERE v.id = NEW.product_variant_id
        AND v.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'stock movement variant must belong to organization')
  END;

  SELECT CASE
    WHEN NEW.related_sale_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM sales s
        WHERE s.id = NEW.related_sale_id
          AND s.organization_id = NEW.organization_id
      )
    THEN RAISE(ABORT, 'stock movement sale must belong to organization')
  END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_negative_stock
BEFORE INSERT ON stock_movements
WHEN NEW.quantity_delta < 0
BEGIN
  SELECT CASE
    WHEN COALESCE((
      SELECT SUM(m.quantity_delta)
      FROM stock_movements m
      WHERE m.organization_id = NEW.organization_id
        AND m.product_variant_id = NEW.product_variant_id
    ), 0) + NEW.quantity_delta < 0
    THEN RAISE(ABORT, 'insufficient stock')
  END;
END;

CREATE TRIGGER IF NOT EXISTS enforce_sale_item_tenant
BEFORE INSERT ON sale_items
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM sales s
      WHERE s.id = NEW.sale_id
        AND s.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'sale item sale must belong to organization')
  END;

  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM product_variants v
      WHERE v.id = NEW.product_variant_id
        AND v.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'sale item variant must belong to organization')
  END;
END;

CREATE TRIGGER IF NOT EXISTS enforce_payment_tenant
BEFORE INSERT ON payments
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM sales s
      WHERE s.id = NEW.sale_id
        AND s.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'payment sale must belong to organization')
  END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_payment_overage
BEFORE INSERT ON payments
BEGIN
  SELECT CASE
    WHEN COALESCE((
      SELECT SUM(p.amount_minor)
      FROM payments p
      WHERE p.organization_id = NEW.organization_id
        AND p.sale_id = NEW.sale_id
    ), 0) + NEW.amount_minor >
    COALESCE((
      SELECT s.total_minor
      FROM sales s
      WHERE s.id = NEW.sale_id
        AND s.organization_id = NEW.organization_id
    ), -1)
    THEN RAISE(ABORT, 'payment exceeds sale total')
  END;
END;

CREATE TRIGGER IF NOT EXISTS enforce_scan_code_tenant
BEFORE INSERT ON scan_codes
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM product_variants v
      WHERE v.id = NEW.product_variant_id
        AND v.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'scan code variant must belong to organization')
  END;
END;
