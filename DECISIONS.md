# DECISIONS.md

This file records important project decisions so future work does not repeatedly reopen settled questions without new evidence.

## 2026-09-19: Mobile First
Decision: Build for phone use first while retaining a responsive desktop experience.

Reason: The primary user needs quick, simple entry and is not technically sophisticated.

## 2026-09-19: Next.js
Decision: Use Next.js with TypeScript.

Reason: Provides a familiar full-stack application structure and leaves room for future SaaS/admin capabilities without requiring a second frontend stack.

## 2026-09-19: Cloudflare
Decision: Host application/server functionality on Cloudflare infrastructure.

Initial target:
- Cloudflare Workers
- Cloudflare D1
- Article6 subdomain

Reason: Existing operational familiarity and a low-cost path for early usage.

## 2026-09-19: Avoid Supabase Dependency
Decision: Do not make Supabase the core authentication/database platform.

Reason: Avoid per-user/platform cost pressure if the application spreads to other schools.

## 2026-09-19: Open Authentication Layer
Decision: Prefer Better Auth or an equivalent open-source authentication layer that works with the chosen database and does not charge per monthly active user.

## 2026-09-19: Multi-Tenant From Day One
Decision: Include organizations and memberships in the first schema even though only one school exists initially.

Reason: The owner may introduce the product to other schools. Retrofitting tenancy later creates unnecessary security and migration risk.

## 2026-09-19: One D1 Database Initially
Decision: Use one database with tenant-scoped records.

Reason: Simplest operational model for the expected early scale.

Revisit when:
- regulatory isolation requires it
- a very large tenant needs isolation
- operational or performance data supports a change

## 2026-09-19: Ledger-Based Inventory
Decision: Inventory is calculated from stock movements rather than maintained as an editable quantity field.

Reason: Creates traceability and prevents silent historical rewriting.

## 2026-09-19: QR Later, Schema Ready Now
Decision: Do not build QR scanning in the first MVP, but add stable product variant IDs and support future scan aliases.

Reason: QR can make mobile entry faster later, but the manual workflow must first be correct and easy.

## 2026-09-19: Product Scope
Decision: This is an inventory/sales ledger, not a complete accounting, school management, or ERP system.

Add adjacent modules only after real usage demonstrates demand.


## 2026-09-19: Temporary Single-Owner Bootstrap
Decision: The first database-backed preview uses the seeded organization ID `org_default` until authentication and organization membership are wired.

Reason: This lets the inventory, sales, payment, expense, and audit ledger be tested immediately without weakening the final multi-tenant schema.

Constraint: Do not treat `org_default` as the final authorization model and do not load sensitive real-school data until owner authentication and server-side membership scoping are enabled.
