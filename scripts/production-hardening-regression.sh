#!/usr/bin/env bash
set -euo pipefail

grep -q '"pattern": "store.article6.org"' wrangler.jsonc
grep -q '"BETTER_AUTH_URL": "https://store.article6.org"' wrangler.jsonc
grep -q 'BETTER_AUTH_SECRET is required in production' lib/auth.ts
grep -q 'isProduction' lib/auth.ts
grep -q 'api/health' .github/workflows/ci.yml
grep -q '"ok":true' .github/workflows/ci.yml
grep -q 'SELECT 1 AS ok' app/api/health/route.ts
grep -q 'Cache-Control' app/api/health/route.ts
grep -q 'Do not deploy manually unless CI/CD itself is broken' PRODUCTION.md
grep -q 'Google sign-in is intentionally tracked separately in issue #26' PRODUCTION.md

echo "PASS: production hardening acceptance"
