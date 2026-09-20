# School Ledger System

## Purpose
Build a simple, mobile-first inventory and sales ledger for small schools that sell books, uniforms, stationery, and similar items.

The first user is a non-technical school owner who currently records transactions by hand and can lose money when records are missing, unclear, or changed by staff.

The system must make it easy to answer four questions at any time:

1. What stock came in?
2. What was sold?
3. What stock remains?
4. How much money should have been received, was received, and is still outstanding?

## Product Principle
This is not a general accounting system.

It is a trusted operational ledger for school inventory and money.

Optimize for:
- very fast input on a phone
- very few taps
- large, obvious actions
- minimal typing
- clear numbers
- permanent transaction history
- easy use by non-technical staff

Do not optimize for:
- complex accounting workflows
- charts for their own sake
- enterprise ERP features
- customization before real users ask for it

## Primary Navigation
The first screen should center on four actions:

- Sell Item
- Add Stock
- Inventory
- Money

Secondary functions such as staff, settings, audit history, exports, and reports should stay out of the primary workflow.

## Core Architecture

### Frontend
- Next.js
- TypeScript
- mobile-first responsive UI
- installable PWA when practical
- deployed on Cloudflare Workers

### Backend
- Cloudflare Workers
- Cloudflare D1
- Better Auth or equivalent open-source auth that does not charge per active user

### Initial Domain
Use an Article6 subdomain initially, for example:

`store.article6.org`

The domain must not be coupled to the database or tenant identity so it can change later.

## Multi-Tenant From Day One
The system may later be introduced to other schools.

All business data must belong to an organization/school.

Never rely on client-side filtering for tenant isolation.

Every server-side query that accesses school data must be scoped by organization ID derived from the authenticated session, not from a trusted browser parameter alone.

Initial tenancy model:

- one app
- one D1 database
- many organizations

Do not create one database per school until scale or isolation requirements justify it.

## Roles
### Owner
Can:
- view all inventory and money
- add and edit products
- add stock
- record sales
- see balances
- manage staff
- view audit history
- perform or approve stock adjustments

### Staff
Can initially:
- record sales
- add stock if permitted
- view inventory needed for work

Staff must not be able to permanently erase transaction history.

## Ledger Model
Inventory must be derived from immutable stock movements rather than a manually editable quantity field.

Examples:

- +50 received
- -2 sold
- -1 damaged
- +10 received

Current stock is the sum of relevant movements.

Corrections should create compensating entries rather than deleting history.

## Money Model
For every sale, track:

- total amount
- amount paid
- balance outstanding
- payment history

The system should calculate totals automatically.

A user should not need a calculator for normal workflows.

## Audit Requirements
Every important action must record:

- actor
- organization
- action
- affected record
- timestamp
- before/after context when appropriate

Critical events include:

- stock received
- stock adjusted
- sale created
- payment recorded
- sale corrected or voided
- product price changed
- staff permissions changed

Deletion of financial or inventory history should generally be prohibited.

## Mobile Input Rules
A normal sale should be recordable in about five seconds once products exist.

Prefer:
- recent items
- favorites
- large tap targets
- numeric keyboards for quantities and money
- sensible defaults
- automatic calculations
- one primary action per screen

Avoid:
- long forms
- dense tables on mobile
- repeated typing of product names
- hidden required fields

## Barcode Scanning
Barcode scanning is a V1 shortcut for the phone workflow and does not use a vision model or paid inference API.

Each sellable product/variant has a stable internal ID and may have one or more scan-code aliases.

Workflow:

1. Scan barcode
2. Resolve the code within the authenticated school
3. Select the matching product variant
4. Enter quantity and payment details as needed
5. Save through the existing ledger mutation

If the code is unknown, an owner may create the item with that barcode prefilled. If camera access or decoding fails, manual item selection remains available.

Do not make barcode or QR values the primary identifier in the database. They are lookup aliases for stable internal product variant IDs.

## Reliability Rules
- Never trust calculated totals sent from the browser when the server can calculate them.
- Use database transactions for multi-step writes where consistency matters.
- Prevent negative stock unless an explicit policy later allows it.
- Use idempotency protections where duplicate submissions could create duplicate sales or payments.
- Index organization ID and common lookup fields from the beginning.
- Backups/export must exist before the system holds important real records.

## PR Acceptance Gate
Every feature or fix PR must include a feature-specific acceptance pass before merge.

A PR is not considered done merely because it typechecks, builds, or deploys.

For each PR:
- identify the user-visible or system invariant being added or changed
- exercise the happy path
- exercise the most important failure and duplicate/retry paths
- verify permissions and tenant isolation where relevant
- verify the resulting database state, not only the UI response
- add automated regression coverage when practical
- do not merge until the feature-specific acceptance pass is green

For integrity-sensitive work, test the invariant destructively when safe. For example, if history is meant to be immutable, CI should attempt to alter or delete it and prove the database rejects the operation.

The database must defend critical truth even if application code is wrong. Important protections should live at the database layer where practical, using constraints, foreign keys, append-only ledgers, triggers, idempotency, and explicit migrations.

Application tests protect behavior. Database invariants protect records. Backup and recovery protect against migration mistakes, operator error, and catastrophic failure. All three layers are required before the system is trusted as the sole source of important records.

## V1 Scope
Build only:

1. Authentication
2. Organization setup
3. Products and variants
4. Add stock
5. Sell item
6. Record payments and balances
7. Inventory view
8. Money summary
9. Activity/audit history
10. Staff accounts and basic roles
11. Export/backup path
12. Mobile polish
13. Barcode scanning for stock and sales

## Explicitly Deferred
- advanced accounting
- payroll
- student management
- fee collection unrelated to shop inventory
- analytics dashboards
- native mobile apps
- barcode/QR label printing
- purchase orders
- supplier portal
- offline-first sync

These should be added only when validated by actual usage.

## Success Criteria
The first version succeeds if the owner can use it without technical help to:

- see current stock
- record stock received
- record a sale
- record partial payment
- see outstanding balances
- understand today's money
- identify who recorded each transaction
- recover records even if a phone or notebook is lost


## Authentication and Tenant Isolation
Owner authentication uses Better Auth with email/password credentials stored in D1.

After sign-in:
- the session identifies the user
- server-side membership lookup resolves the school organization
- reads and writes use that organization ID
- browser-supplied organization IDs are not trusted

A new owner creates an account, then completes a one-screen school setup flow. The school workspace is created in `organizations` and linked through `organization_members`.

`BETTER_AUTH_SECRET` must be configured as a Cloudflare Worker secret before real use.

## Staff Invitations and Authorization
Staff access is invitation-based.

- Owners create pending staff invitations by normalized email address.
- An authenticated user whose email matches a pending invitation is linked to that school as STAFF.
- Invited staff cannot use the organization setup endpoint to create a separate owner workspace before accepting the invite.
- STAFF may record sales, receive stock, and view inventory.
- Money, product creation/price control, expenses, payments against outstanding balances, and staff management are OWNER-only unless a later decision explicitly expands permissions.
- Authorization is enforced server-side with role checks; hidden UI is not treated as a security boundary.
- Staff activation/deactivation and invitation acceptance are audit events.

## Authentication UX and Recovery
Authentication uses Better Auth with these supported paths:

- Continue with Google when Google OAuth credentials are configured
- email + password fallback
- password confirmation on new email/password accounts
- forgot-password email with an expiring reset link
- password reset revokes other active sessions
- transactional welcome email for newly created users

Transactional auth email is sent through Resend using the verified Article6 domain.

Required production secrets:
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- RESEND_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

Optional:
- EMAIL_FROM

Google and credential accounts with the same verified email should resolve to one Better Auth user rather than creating a second school identity.

Magic-link sign-in is deferred until real usage shows a need for a third sign-in method.

