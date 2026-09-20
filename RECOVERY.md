# School Ledger Recovery

## Purpose

This runbook is for recovering the production Cloudflare D1 database if a bad migration, accidental write, or application bug damages School Ledger data.

Database: `store-db`

## Recovery layers

School Ledger uses three separate protections:

1. Application acceptance tests to catch behavior regressions before merge.
2. Database constraints/triggers to reject invalid or destructive writes.
3. Cloudflare D1 Time Travel and manual SQL exports for recovery if production data is still damaged.

Cloudflare D1 Time Travel is automatically available on production D1 databases. Retention depends on the Workers plan: 7 days on Free and 30 days on Paid.

## Before any risky migration

Record the current bookmark:

```bash
npx wrangler d1 time-travel info store-db
```

Also create a full SQL export:

```bash
mkdir -p backups
npx wrangler d1 export store-db --remote --output="./backups/store-db-$(date +%Y%m%d-%H%M%S).sql"
```

Keep that file outside the application repository if it contains production records.

## If production data is damaged

### 1. Stop making further changes

Do not run additional migrations or manual corrective SQL until the recovery point is identified.

### 2. Capture the current state first

Before restoring, record the current bookmark:

```bash
npx wrangler d1 time-travel info store-db
```

Create a current-state export if the database still responds:

```bash
mkdir -p backups
npx wrangler d1 export store-db --remote --output="./backups/store-db-before-restore-$(date +%Y%m%d-%H%M%S).sql"
```

This gives us a way to inspect what went wrong and helps preserve data written after the damage.

### 3. Find a known-good recovery point

Use an RFC3339 timestamp from before the damaging event:

```bash
npx wrangler d1 time-travel info store-db --timestamp="2026-09-20T06:00:00Z"
```

Confirm the timestamp carefully before restoring.

### 4. Restore

Restore by timestamp:

```bash
npx wrangler d1 time-travel restore store-db --timestamp="2026-09-20T06:00:00Z"
```

Or restore using a bookmark returned by `time-travel info`:

```bash
npx wrangler d1 time-travel restore store-db --bookmark="<BOOKMARK>"
```

A restore overwrites the live database in place and cancels in-flight queries. Cloudflare returns the previous bookmark; save it because it can be used to undo the restore.

### 5. Verify after restore

Run migrations status:

```bash
npx wrangler d1 migrations list store-db --remote
```

Check core record counts:

```bash
npx wrangler d1 execute store-db --remote --command="
SELECT
  (SELECT COUNT(*) FROM organizations) AS organizations,
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM stock_movements) AS stock_movements,
  (SELECT COUNT(*) FROM sales) AS sales,
  (SELECT COUNT(*) FROM payments) AS payments,
  (SELECT COUNT(*) FROM expenses) AS expenses,
  (SELECT COUNT(*) FROM audit_events) AS audit_events;
"
```

Then run the production smoke checks before allowing normal use again.

## Owner exports

The owner-facing `/export` screen provides tenant-scoped CSV copies of:

- products
- current inventory
- stock movement history
- sales
- payments
- expenses
- audit events

These CSV files are for independent review and safekeeping. They are not a replacement for full D1 recovery because they do not contain authentication/session data or the complete database schema.

## Safety rules

- Never restore production without first recording the current bookmark.
- Never assume the most recent timestamp is the correct recovery point.
- Never commit production SQL exports to Git.
- Preserve audit and ledger history; use recovery only for actual corruption or destructive mistakes.
- After recovery, investigate the cause and add a regression test before making the same class of change again.
