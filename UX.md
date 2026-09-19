# UX.md

## User
Design first for a non-technical school owner using a phone.

If a feature is powerful but confusing, simplify it.

## Home
Primary actions should dominate the screen:

1. Sell Item
2. Add Stock
3. Inventory
4. Money

Show a small summary above or below them:
- today's sales
- money received
- outstanding balance

Do not turn the home screen into a dashboard full of cards.

## Sell Item Flow
Target: common sale completed in about five seconds.

Ideal flow:

1. Tap Sell Item
2. Tap recent/frequent product
3. Quantity defaults to 1
4. Price appears automatically
5. Amount paid defaults to total
6. Tap Record Sale

If partial payment:
- user changes Amount Paid
- system calculates Balance automatically

Never ask the user to calculate balance manually.

## Add Stock Flow
Ideal flow:

1. Tap Add Stock
2. Tap/search recent product
3. Enter quantity received
4. Optional unit cost
5. Save

Advanced supplier or purchase order data is deferred.

## Inventory Flow
Show:
- product name
- variant
- quantity remaining

Make low/zero stock visually obvious without requiring charts.

Search should be available as inventory grows.

## Money Flow
Keep concepts concrete:

- Sales
- Money Received
- Outstanding
- Expenses

Avoid exposing accounting terminology such as receivables, journal entries, debit, credit, COGS, or reconciliation in the primary UI.

## Forms
- one column on mobile
- labels always visible
- numeric keyboard for money and quantity
- no tiny controls
- destructive actions clearly separated
- save button reachable with one hand where possible
- prevent accidental double taps

## Product Selection
Prioritize in this order:

1. scan code later
2. recent items
3. frequently sold items
4. search
5. full browse list

This minimizes typing.

## QR Future
Scanning should be a shortcut, not a separate complex workflow.

Expected flow:

Scan → Product → Quantity → Paid → Save

If the camera fails, manual selection must always remain available.

## Confirmation
After saving, show a brief clear confirmation such as:

`Sale recorded · 1 Uniform Size 10 · ₦8,000`

Do not make the user dismiss unnecessary modal dialogs.

## Error Handling
Errors should explain what the user can do next.

Bad:
`Constraint violation`

Good:
`Only 2 are in stock. Reduce the quantity or add stock first.`

Never expose database or stack errors to end users.


## Quick Return Pattern
For the two most frequent write actions:
- Add Stock
- Sell Item

After a successful save, return directly to Home and show a brief confirmation banner.

Do not require the owner to manually navigate back after each routine transaction.

Inventory and Money remain separate views because they are primarily for checking information rather than rapid repeated entry.

Creating a brand-new product may remain on the Add Stock screen so stock can be added immediately after creation.


## Plain-Language Number Labels
Never place an unexplained number beside another number.

Inventory cards should explicitly label:
- selling price
- quantity in stock

Money should use:
- Total sold = value of items sold
- Money received = amount already paid
- Still owed = sold amount not yet paid
- Expenses = money spent from the shop

Prefer “Still owed” over “Outstanding” in primary UI because it is clearer for non-technical users.

## Role-Specific Home
Owners retain the four primary actions and money summary.

Staff see only the primary workflows they are permitted to use:
- Sell Item
- Add Stock
- Inventory

Do not show staff the owner money summary, Money action, product-creation controls, or staff-management controls.

The Staff screen is secondary owner-only navigation. Adding staff should require only name and email. Until magic-link or Google sign-in is added, the invited person creates or signs in to an account using the exact invited email.

## Sign-In and Recovery
Preferred sign-in order:

1. Continue with Google when available
2. Email + password

Email/password account creation requires:
- name
- email
- password
- confirm password

The form must block account creation when the two password entries do not match.

Sign-in includes a clear Forgot password? action. Password-reset requests always show a generic confirmation so the UI does not reveal whether an email address has an account.

Magic link is deferred for now. Google sign-in plus password recovery keeps the surface simpler while still providing an easy recovery path.

