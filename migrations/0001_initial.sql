PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER','STAFF')),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  cost_price_minor INTEGER,
  selling_price_minor INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS scan_codes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_variant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  code_type TEXT NOT NULL DEFAULT 'INTERNAL_QR',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_codes_org_code
ON scan_codes(organization_id, code)
WHERE active = 1;

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  total_minor INTEGER NOT NULL,
  customer_name TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  voided_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  product_variant_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL,
  line_total_minor INTEGER NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  method TEXT,
  note TEXT,
  received_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  product_variant_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  unit_cost_minor INTEGER,
  related_sale_id TEXT,
  reason TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (product_variant_id) REFERENCES product_variants(id),
  FOREIGN KEY (related_sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  category TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_products_org_active
ON products(organization_id, active);

CREATE INDEX IF NOT EXISTS idx_variants_org_product
ON product_variants(organization_id, product_id);

CREATE INDEX IF NOT EXISTS idx_stock_org_variant_created
ON stock_movements(organization_id, product_variant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_sales_org_created
ON sales(organization_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_org_sale
ON payments(organization_id, sale_id);

CREATE INDEX IF NOT EXISTS idx_audit_org_created
ON audit_events(organization_id, created_at);

INSERT OR IGNORE INTO organizations (id, name, currency)
VALUES ('org_default', 'My School', 'NGN');
