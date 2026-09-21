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

Google OAuth is optional convenience and must never replace the email/password fallback:

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

Google sign-in remains secondary to email/password. Keep issue #26 open until one real production Google login succeeds end-to-end.


## Platform owner dashboard

The read-only `/admin` dashboard is disabled unless `PLATFORM_ADMIN_EMAILS` is configured in the Worker environment.

- use a comma-separated list of explicitly authorized login emails
- access is denied to every other signed-in user
- every dashboard view is written to `platform_admin_audit`
- the dashboard cannot edit, impersonate, or switch into a school
