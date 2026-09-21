#!/usr/bin/env bash
set -euo pipefail

grep -q 'createAuthClient' lib/auth-client.ts
grep -q 'signIn.social' app/login/login-form.tsx
grep -q 'provider: "google"' app/login/login-form.tsx
grep -q 'callbackURL: "/"' app/login/login-form.tsx
grep -q 'errorCallbackURL: "/login?error=google"' app/login/login-form.tsx
grep -q 'googleEnabled={capabilities.google}' app/login/page.tsx
grep -q 'disableImplicitLinking: false' lib/auth.ts
grep -q 'GOOGLE_CLIENT_ID' lib/auth.ts
grep -q 'GOOGLE_CLIENT_SECRET' lib/auth.ts
grep -q 'Try email and password instead' app/login/login-form.tsx

echo "PASS: Google OAuth acceptance"
