# DATA_MODEL.md

## Principles
- Multi-tenant from the first migration.
- Inventory is event/ledger based.
- Money uses explicit sales and payments.
- Important history is append-oriented.
- Product variants are canonical sellable units.
- QR/barcodes are optional aliases, not primary identity.

## Core Tables

### organizations
Represents one school/business tenant.

Suggested fields:
- id
- name
- created_at
- updated_at

### users
Application identities.

Suggested fields:
- id
- name
- email or login identifier
- auth metadata
- created_at

### organization_members
Connects users to schools.

Suggested fields:
- organization_id
- user_id
- role: OWNER | STAFF
- status
- created_at

Unique constraint:
- organization_id + user_id

### products
Human-level product, for example `School Uniform` or `Primary 3 Mathematics Book`.

Suggested fields:
- id
- organization_id
- name
- category
- active
- created_at
- updated_at

### product_variants
Canonical sellable inventory unit.

Examples:
- School Uniform / Size 8
- School Uniform / Size 10
- Mathematics Book / Primary 3

Suggested fields:
- id
- organization_id
- product_id
- variant_name
- sku optional
- cost_price_minor optional
- selling_price_minor
- active
- created_at
- updated_at

### scan_codes
QR/barcode lookup aliases used by the active mobile scanning flow.

Suggested fields:
- id
- organization_id
- product_variant_id
- code
- code_type: INTERNAL_QR | BARCODE | OTHER
- active
- created_at

Active codes are unique within an organization so one scan cannot resolve to multiple variants. The same physical barcode value may exist in another organization without conflict.

### stock_movements
Source of truth for inventory movement.

Suggested fields:
- id
- organization_id
- product_variant_id
- movement_type
- quantity_delta
- unit_cost_minor optional
- related_sale_id optional
- reason optional
- created_by_user_id
- created_at

Common movement types:
- RECEIVE
- SALE
- RETURN
- DAMAGE
- ADJUSTMENT
- VOID_REVERSAL

Current stock = SUM(quantity_delta) for the variant.

### sales
One customer transaction.

Suggested fields:
- id
- organization_id
- status
- total_minor
- created_by_user_id
- created_at
- voided_at optional

Current:
- optional customer/student/parent name for outstanding balances

Optional later:
- class
- reference/note

Do not require customer details for a normal walk-up sale.

### sale_items
Line items for a sale.

Suggested fields:
- id
- organization_id
- sale_id
- product_variant_id
- quantity
- unit_price_minor
- line_total_minor

Server calculates line_total_minor.

### payments
Money received against a sale.

Suggested fields:
- id
- organization_id
- sale_id
- amount_minor
- method optional
- note optional
- received_by_user_id
- created_at

Outstanding balance = sale total - effective payments.

### payment_adjustments
Append-only corrections to money received. Original payments are never edited or deleted.

Fields include:
- id
- organization_id
- sale_id
- related_payment_id optional
- amount_delta_minor (signed)
- reason
- created_by_user_id
- created_at

Effective payments = SUM(payments.amount_minor) + SUM(payment_adjustments.amount_delta_minor).
A voided sale appends a negative adjustment for any money previously recorded and appends `VOID_REVERSAL` stock movements to restore sold units.

### expenses
Simple shop expenses, not full accounting.

Suggested fields:
- id
- organization_id
- description
- amount_minor
- category optional
- created_by_user_id
- created_at

### audit_events
Permanent operational history.

Suggested fields:
- id
- organization_id
- actor_user_id
- event_type
- entity_type
- entity_id
- metadata_json
- created_at

## Currency
Store money as integer minor units where the currency supports them.

Avoid floating-point calculations for financial data.

Keep organization currency configurable even if the first deployment uses NGN.

## Tenant Safety
Indexes should begin with organization_id for common tenant-scoped queries.

Examples:
- products(organization_id, active)
- product_variants(organization_id, product_id)
- stock_movements(organization_id, product_variant_id, created_at)
- sales(organization_id, created_at)
- payments(organization_id, sale_id)
- payment_adjustments(organization_id, sale_id, created_at)
- audit_events(organization_id, created_at)

## Deletion Policy
Prefer soft deactivation for products and staff.

Do not cascade-delete historical sales, payments, stock movements, or audit records because a product or user is deactivated.


## Authentication Tables
Better Auth owns these D1 tables:
- `user`
- `session`
- `account`
- `verification`

`organization_members.user_id` references Better Auth's `user.id`.

The older bootstrap `users` table from migration 0001 is removed by the auth migration and must not be reintroduced.

## Tenant Resolution
The authenticated session gives the user ID. The server resolves the active `organization_members` row and uses its `organization_id` for all tenant-owned queries and writes.

Client-provided organization IDs are never authorization evidence.

## Staff Invitations
`staff_invites` represents pending owner-issued invitations before a Better Auth user is linked to a school.

Fields include:
- id
- organization_id
- normalized email
- name
- status: PENDING | ACCEPTED | REVOKED
- invited_by_user_id
- accepted_by_user_id optional
- created_at
- accepted_at optional

A school may have only one pending invite for the same normalized email. When the matching authenticated email is accepted, the system creates an `organization_members` row with role STAFF and records the acceptance in the audit log.

Staff membership is deactivated by changing membership status, not deleting historical identity or transactions.

