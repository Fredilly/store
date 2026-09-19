ALTER TABLE sales ADD COLUMN submission_key TEXT;
ALTER TABLE payments ADD COLUMN submission_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_org_submission_key
ON sales(organization_id, submission_key)
WHERE submission_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_org_submission_key
ON payments(organization_id, submission_key)
WHERE submission_key IS NOT NULL;
