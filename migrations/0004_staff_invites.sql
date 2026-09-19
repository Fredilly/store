CREATE TABLE IF NOT EXISTS staff_invites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REVOKED')),
  invited_by_user_id TEXT NOT NULL,
  accepted_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (invited_by_user_id) REFERENCES "user"(id),
  FOREIGN KEY (accepted_by_user_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_email_status
ON staff_invites(email, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invites_org_email_pending
ON staff_invites(organization_id, email)
WHERE status = 'PENDING';
