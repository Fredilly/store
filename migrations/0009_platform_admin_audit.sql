CREATE TABLE IF NOT EXISTS platform_admin_audit (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_audit_created
ON platform_admin_audit(created_at);
