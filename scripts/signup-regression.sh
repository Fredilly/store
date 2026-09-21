#!/usr/bin/env bash
set -euo pipefail

PAGE="app/login/page.tsx"
FORM="app/login/login-form.tsx"
ROUTE="app/api/signup/route.ts"

grep -q 'initialMode={params.mode === "signup"' "$PAGE" || { echo "FAIL: signup mode is not server-rendered"; exit 1; }
grep -q 'href={mode === "signin" ? "/login?mode=signup" : "/login"}' "$FORM" || { echo "FAIL: create-account switch is not a normal link"; exit 1; }
grep -q 'action={mode === "signin" ? "/api/login" : "/api/signup"}' "$FORM" || { echo "FAIL: signup does not have a native form action"; exit 1; }
grep -q 'name="confirm_password"' "$FORM" || { echo "FAIL: confirm password is not submitted"; exit 1; }
grep -q 'api.signUpEmail' "$ROUTE" || { echo "FAIL: server signup route missing"; exit 1; }
grep -q 'password !== confirmPassword' "$ROUTE" || { echo "FAIL: server password confirmation missing"; exit 1; }

echo "PASS: server-side signup compatibility"
