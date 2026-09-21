#!/usr/bin/env bash
set -euo pipefail

grep -q 'PLATFORM_ADMIN_EMAILS' lib/platform-admin.ts
grep -q 'redirect("/")' lib/platform-admin.ts
grep -q 'PLATFORM_DASHBOARD_VIEWED' lib/platform-admin.ts
grep -q 'platform_admin_audit' migrations/0009_platform_admin_audit.sql
grep -Fq "WHERE o.id != 'org_default'" lib/platform-admin-queries.ts
grep -q 'ownerEmail' lib/platform-admin-queries.ts
grep -q 'staffCount' lib/platform-admin-queries.ts
grep -q 'itemCount' lib/platform-admin-queries.ts
grep -q 'saleCount' lib/platform-admin-queries.ts
grep -q 'lastActivityAt' lib/platform-admin-queries.ts
grep -q 'Read only. No editing, impersonation, or school switching' app/admin/page.tsx

if grep -Eq '<form|method=|fetch\(' app/admin/page.tsx; then
  echo "FAIL: admin dashboard must stay read-only"
  exit 1
fi

echo "PASS: platform owner dashboard acceptance"
