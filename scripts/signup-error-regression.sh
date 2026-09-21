#!/usr/bin/env bash
set -euo pipefail

ROUTE="app/api/signup/route.ts"
PAGE="app/login/page.tsx"
FORM="app/login/login-form.tsx"

grep -q 'signup_name' "$ROUTE" || { echo "FAIL: signup name is not preserved"; exit 1; }
grep -q 'login_email' "$ROUTE" || { echo "FAIL: signup email is not preserved"; exit 1; }
grep -q 'USER_ALREADY_EXISTS' "$ROUTE" || { echo "FAIL: duplicate account is not identified"; exit 1; }
grep -q 'Signup failed' "$ROUTE" || { echo "FAIL: server diagnostics missing"; exit 1; }
grep -q 'This email already has an account' "$PAGE" || { echo "FAIL: duplicate-account message missing"; exit 1; }
grep -q 'initialName={initialName}' "$PAGE" || { echo "FAIL: preserved name is not passed to form"; exit 1; }
grep -q 'useState(initialName)' "$FORM" || { echo "FAIL: preserved name is not restored"; exit 1; }

if grep -q 'formCookie(".*password' "$ROUTE"; then
  echo "FAIL: password must never be persisted"
  exit 1
fi

echo "PASS: signup persistence and error handling"
