#!/usr/bin/env bash
set -euo pipefail

grep -q 'Sold today' app/page.tsx
grep -q 'Received today' app/page.tsx
grep -q 'href="/history"' app/page.tsx
grep -q 'listRecentTransactions' app/history/page.tsx
grep -q '<details className="historyRow"' app/history/page.tsx
grep -q 'HistoryActions' app/history/page.tsx
grep -q 'Download PDF' components/history-actions.tsx
grep -q 'navigator.share' components/history-actions.tsx
grep -q 'Content-Type.*application/pdf' app/api/history/pdf/route.ts
grep -q 'DATA_EXPORTED' app/api/history/pdf/route.ts
grep -q 'SALE_CREATED' lib/queries.ts
grep -q 'STOCK_RECEIVED' lib/queries.ts
grep -q 'PAYMENT_RECORDED' lib/queries.ts
grep -q 'EXPENSE_RECORDED' lib/queries.ts
grep -q "date(created_at, '+1 hour') = date('now', '+1 hour')" lib/queries.ts

echo "PASS: daily summary and transaction history acceptance"
