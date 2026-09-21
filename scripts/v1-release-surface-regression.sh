#!/usr/bin/env bash
set -euo pipefail

require_text() {
  local file="$1"
  local text="$2"
  local message="$3"

  if ! grep -Fq "$text" "$file"; then
    echo "FAIL: $message"
    echo "Expected '$text' in $file"
    exit 1
  fi
}

echo "Checking V1 release surfaces..."

# Staff lifecycle must be owner-controlled, auditable, and attach invited users
# to the school identified by the invite rather than creating a new owner tenant.
require_text "app/api/staff/invite/route.ts" "requireOwner" "staff invitations must remain owner-only"
require_text "app/api/staff/invite/route.ts" "sendStaffInviteEmail" "staff invitations must send the invitation email"
require_text "app/api/staff/invite/route.ts" "STAFF_INVITED" "staff invitations must be audited"
require_text "app/api/staff/invite/route.ts" "status = 'PENDING'" "duplicate pending invites must be detected"
require_text "lib/tenant.ts" "INSERT OR IGNORE INTO organization_members" "accepted staff invites must create a membership"
require_text "lib/tenant.ts" "'STAFF', 'ACTIVE'" "accepted invite membership must be STAFF"
require_text "lib/tenant.ts" "invite.orgId" "accepted staff must join the invited school"
require_text "lib/tenant.ts" "STAFF_INVITE_ACCEPTED" "invite acceptance must be audited"
require_text "lib/tenant.ts" "UPDATE staff_invites SET status = 'ACCEPTED'" "accepted invites must be consumed"

# Staff must remain blocked from owner-only money/admin mutations.
require_text "app/api/payments/route.ts" "requireOwner" "payments must remain owner-only"
require_text "app/api/expenses/route.ts" "requireOwner" "expenses must remain owner-only"
require_text "app/api/products/route.ts" "requireOwner" "product creation must remain owner-only"
require_text "app/api/staff/status/route.ts" "requireOwner" "staff management must remain owner-only"

# Release history/report must remain tenant-scoped, owner-only and downloadable.
require_text "app/api/history/pdf/route.ts" "requireOwner" "PDF history export must remain owner-only"
require_text "app/api/history/pdf/route.ts" '"Content-Type": "application/pdf"' "PDF endpoint must return a PDF"
require_text "app/api/history/pdf/route.ts" '"Cache-Control": "no-store"' "PDF history must not be cached"
require_text "app/api/history/pdf/route.ts" "DATA_EXPORTED" "PDF downloads must be audited"
require_text "app/api/history/pdf/route.ts" "dailySummary(tenant.orgId)" "PDF summary must be tenant-scoped"
require_text "app/api/history/pdf/route.ts" "listRecentTransactions(tenant.orgId)" "PDF history must be tenant-scoped"
require_text "components/history-actions.tsx" "Download PDF" "history UI must expose the PDF download"

# Phone-app requirements that CI can verify without pretending to test real hardware.
require_text "app/manifest.ts" 'display: "standalone"' "app must remain installable in standalone mode"
require_text "app/manifest.ts" 'start_url: "/"' "installed app must open at the main workflow"
require_text "components/BarcodeScanner.tsx" "tap Allow camera" "scanner must keep clear permission guidance"
require_text "components/BarcodeScanner.tsx" "manual" "scanner must retain a manual fallback"

echo "PASS: V1 release surface acceptance"
