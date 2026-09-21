#!/usr/bin/env bash
set -euo pipefail

grep -q 'reviewEventTypes' app/activity/page.tsx
grep -q 'SALE_VOIDED' app/activity/page.tsx
grep -q 'PAYMENT_CORRECTED' app/activity/page.tsx
grep -q 'STOCK_CORRECTED' app/activity/page.tsx
grep -q 'STAFF_STATUS_CHANGED' app/activity/page.tsx
grep -q 'DATA_EXPORTED' app/activity/page.tsx
grep -q 'This does not mean fraud occurred' app/activity/page.tsx

grep -q 'requireOwner' app/api/sales/void/route.ts
grep -q 'SALE_VOIDED' app/api/sales/void/route.ts

grep -q 'requireOwner' app/api/payments/correct/route.ts
grep -q 'PAYMENT_CORRECTED' app/api/payments/correct/route.ts

grep -q 'requireOwner' app/api/stock/adjust/route.ts
grep -q 'STOCK_CORRECTED' app/api/stock/adjust/route.ts

grep -q 'STAFF_STATUS_CHANGED' app/api/staff/status/route.ts
grep -q 'DATA_EXPORTED' 'app/api/export/[kind]/route.ts'

grep -q 'prevent_audit_events_update' migrations/0006_immutable_history.sql
grep -q 'prevent_audit_events_delete' migrations/0006_immutable_history.sql
grep -q 'prevent_payment_adjustments_update' migrations/0008_corrections_ledger.sql
grep -q 'prevent_payment_adjustments_delete' migrations/0008_corrections_ledger.sql

echo "PASS: fraud visibility acceptance"
