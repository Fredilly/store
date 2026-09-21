# Production Operations

## Production URL

- https://store.article6.org
- Cloudflare Worker: `store`
- D1 database: `store-db`

## Required production secrets

Secret values must never be committed to Git.

- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`
- `CLOUDFLARE_API_TOKEN` (GitHub Actions)
- `CLOUDFLARE_ACCOUNT_ID` (GitHub Actions)

Google OAuth remains optional until issue #26 is completed:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Non-secret production variables are defined in `wrangler.jsonc`, including:

- `BETTER_AUTH_URL=https://store.article6.org`
- `EMAIL_FROM`

## Deployment

Merging to `main` runs:

1. typecheck
2. production build
3. clean D1 migration test
4. acceptance/regression suite
5. remote D1 migrations
6. Cloudflare deploy
7. production health and login smoke checks

Do not deploy manually unless CI/CD itself is broken.

## Production checks

After deploy, CI verifies:

- `/api/health` returns HTTP 200 and `{"ok":true}`
- production login page loads over HTTPS
- HTTP redirects to HTTPS
- credential failure paths behave correctly
- the server-side login fallback remains present

The health endpoint exposes no secret or account information.

## Auth safety

Production must fail closed if `BETTER_AUTH_SECRET` is missing.

Production Better Auth trusted origins are limited to `https://store.article6.org`.

Temporary workers.dev and localhost origins are development-only.

## Recovery

D1 migrations are applied before deployment. Existing export and D1 recovery procedures remain the recovery path for data.

Google sign-in is intentionally tracked separately in issue #26 and must not block email/password production use.
