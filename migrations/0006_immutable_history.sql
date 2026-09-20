-- Make core financial and inventory history append-only at the database layer.

CREATE TRIGGER IF NOT EXISTS prevent_audit_events_update
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events are immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_events_delete
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events are immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_sales_delete
BEFORE DELETE ON sales
BEGIN
  SELECT RAISE(ABORT, 'sales cannot be deleted; use a correction or void');
END;

CREATE TRIGGER IF NOT EXISTS prevent_sale_items_delete
BEFORE DELETE ON sale_items
BEGIN
  SELECT RAISE(ABORT, 'sale items cannot be deleted; use a correction or void');
END;

CREATE TRIGGER IF NOT EXISTS prevent_payments_delete
BEFORE DELETE ON payments
BEGIN
  SELECT RAISE(ABORT, 'payments cannot be deleted; use a correction');
END;

CREATE TRIGGER IF NOT EXISTS prevent_stock_movements_delete
BEFORE DELETE ON stock_movements
BEGIN
  SELECT RAISE(ABORT, 'stock movements cannot be deleted; use an adjustment');
END;

CREATE TRIGGER IF NOT EXISTS require_audit_actor
BEFORE INSERT ON audit_events
WHEN NEW.actor_user_id IS NULL OR length(trim(NEW.actor_user_id)) = 0
BEGIN
  SELECT RAISE(ABORT, 'audit events require an actor');
END;
