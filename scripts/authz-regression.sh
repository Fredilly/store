#!/usr/bin/env bash
set -euo pipefail

require_contains() {
  local file="$1"
  local pattern="$2"
  local message="$3"

  if ! grep -Fq "$pattern" "$file"; then
    echo "FAIL: $message"
    echo "Expected '$pattern' in $file"
    exit 1
  fi
}

# Owner-only money and administration routes.
require_contains "app/api/payments/route.ts" 'requireOwner' "payments must remain owner-only"
require_contains "app/api/products/route.ts" 'requireOwner' "product creation must remain owner-only"
require_contains "app/api/expenses/route.ts" 'requireOwner' "expenses must remain owner-only"
require_contains "app/api/staff/invite/route.ts" 'requireOwner' "staff invites must remain owner-only"
require_contains "app/api/staff/status/route.ts" 'requireOwner' "staff status changes must remain owner-only"
require_contains "app/activity/page.tsx" 'requirePageOwner' "activity history must remain owner-only"

# Staff-permitted operational routes still require an authenticated tenant.
require_contains "app/api/sales/route.ts" 'requireTenant' "sales must require authenticated school membership"
require_contains "app/api/stock/route.ts" 'requireTenant' "stock receipt must require authenticated school membership"

# Tenant resolution must derive organization from server-side membership.
require_contains "lib/tenant.ts" 'WHERE m.user_id = ?' "tenant lookup must be bound to authenticated user membership"
require_contains "lib/tenant.ts" "m.status = 'ACTIVE'" "inactive membership must not resolve a tenant"
require_contains "lib/tenant.ts" 'tenant.role !== "OWNER"' "owner authorization guard must remain enforced"

echo "PASS: authorization regression contract"
