-- Append-only correction ledgers for money and stronger correction integrity.

CREATE TABLE IF NOT EXISTS payment_adjustments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  related_payment_id TEXT,
  amount_delta_minor INTEGER NOT NULL CHECK (amount_delta_minor <> 0),
  reason TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (related_payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_adjustments_org_sale
ON payment_adjustments(organization_id, sale_id, created_at);

CREATE TRIGGER IF NOT EXISTS enforce_payment_adjustment_tenant
BEFORE INSERT ON payment_adjustments
BEGIN
  SELECT (CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM sales s
      WHERE s.id = NEW.sale_id
        AND s.organization_id = NEW.organization_id
    )
    THEN RAISE(ABORT, 'payment adjustment sale must belong to organization')
  END);

  SELECT (CASE
    WHEN NEW.related_payment_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = NEW.related_payment_id
          AND p.sale_id = NEW.sale_id
          AND p.organization_id = NEW.organization_id
      )
    THEN RAISE(ABORT, 'payment adjustment payment must belong to sale and organization')
  END);
END;

CREATE TRIGGER IF NOT EXISTS prevent_payment_adjustments_update
BEFORE UPDATE ON payment_adjustments
BEGIN
  SELECT RAISE(ABORT, 'payment adjustments are immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_payment_adjustments_delete
BEFORE DELETE ON payment_adjustments
BEGIN
  SELECT RAISE(ABORT, 'payment adjustments are immutable');
END;