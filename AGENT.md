# AGENT.md

## Mission
Build and maintain the School Ledger application as a simple, trustworthy, mobile-first inventory and sales system for small schools.

The first user is non-technical. Ease of use and prevention of record loss or silent manipulation are more important than feature count.

## Non-Negotiables
1. Keep the product simple.
2. Optimize the primary workflows for mobile first.
3. Minimize typing and taps.
4. Preserve an auditable transaction history.
5. Design for multiple schools from day one.
6. Do not add infrastructure or product complexity without a clear need.
7. Do not introduce paid per-user dependencies when a reliable low-cost alternative exists.
8. Never weaken tenant isolation or auditability for convenience.

## Current Stack
- Next.js
- TypeScript
- Cloudflare Workers
- Cloudflare D1
- Better Auth or equivalent open-source authentication
- Article6 subdomain initially

Before changing the stack, explain the concrete problem the change solves.

## UX Standard
The application should feel understandable to someone comfortable with WhatsApp but not business software.

Primary home actions:
- Sell Item
- Add Stock
- Inventory
- Money

Use:
- large touch targets
- short labels
- large readable numbers
- numeric input modes
- smart defaults
- recent/frequent product shortcuts
- immediate confirmation after saves

Avoid:
- accounting jargon
- dense admin dashboards
- unnecessary modals
- multi-step flows where one screen will do
- fields the system can calculate itself

## Data Integrity Rules
Inventory is ledger-based.

Do not directly overwrite stock totals as the normal workflow.

Use stock movement records such as:
- RECEIVE
- SALE
- DAMAGE
- RETURN
- ADJUSTMENT
- VOID_REVERSAL

Corrections should normally append compensating events rather than erase history.

Financial records follow the same principle.

## Multi-Tenant Rules
Every tenant-owned business record must contain an organization ID or be reachable only through a parent that is tenant scoped.

Authorization must happen server-side.

Never trust an organization ID supplied by the client without checking membership from the authenticated session.

Tests should include cross-tenant access attempts for sensitive routes.

## Authentication and Staff
Owner accounts may use normal credentials.

Staff UX may later use a simplified PIN flow, but PINs must:
- be hashed
- be rate limited
- never be stored in plaintext
- map to a real staff identity for audit purposes

Do not share one anonymous staff login between multiple people if accountability is required.

## QR/Barcode Future
Prepare the schema for scan aliases now, but do not build scanning until the core manual flow is stable.

A scan code should resolve to a product variant ID.

The product variant ID remains the canonical identity.

## Development Priorities
Order of work:

1. correct data model
2. tenant isolation
3. core mobile workflow
4. auditability
5. reliability and tests
6. visual polish
7. secondary features

## V1 Engineering Rules
- Keep server mutations explicit and small.
- Validate all writes on the server.
- Calculate totals server-side.
- Use integer minor currency units where practical rather than floating-point money.
- Add indexes for organization-scoped lookups.
- Prevent accidental double submission of critical mutations.
- Prefer schema migrations over manual database edits.
- Seed realistic demo data for development.
- Keep secrets out of the repository.
- Maintain `.env.example` or equivalent documented environment requirements.

## Testing Minimum
Before merging changes that affect core flows, verify:

- owner can log in
- staff can log in if enabled
- product can be created
- stock can be received
- sale reduces available inventory
- partial payment creates the correct balance
- additional payment reduces the balance correctly
- audit event is recorded
- one organization cannot read or mutate another organization's records
- duplicate submission does not silently create duplicate money/inventory events

## Scope Discipline
Do not add features merely because they are common in POS or accounting software.

For every proposed feature ask:

1. Does the first user need this now?
2. Does it make recording a transaction faster or safer?
3. Does it prevent loss, fraud, or confusion?
4. Can it wait until real usage demonstrates demand?

If the answer is mostly no, defer it.

## Documentation Discipline
When architecture, product rules, or accepted scope changes:

- update `SYSTEM.md`
- update `DATA_MODEL.md` if schema semantics change
- update `UX.md` if primary workflows change
- update `DECISIONS.md` for important irreversible or expensive decisions

Docs should describe the current intended system, not preserve obsolete plans as if they are active.
