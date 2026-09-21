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

1. scan barcode
2. recent items
3. frequently sold items
4. search
5. full browse list

This minimizes typing.

## Barcode Scanning
Scanning is a shortcut, not a separate workflow.

Sell:
Scan → Product → Quantity → Paid → Save

Add Stock:
Scan → Product → Quantity → Save

Unknown barcode for an owner:
Scan → New item form with barcode prefilled → Create item

If the camera fails, is denied, or cannot decode the barcode, manual selection must always remain available.

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

Creating a brand-new item remains on the Add Stock screen.

New item setup should stay plain-language and one-step:
- Item name
- Selling price
- Size / class only if needed
- Optional barcode
- Starting stock
- Optional cost price

Do not require category, SKU, or other inventory jargon in the primary flow. Creating the item and its starting stock should commit together so the owner does not end up with a half-created item.


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
Preferred sign-in layout:

1. Email + password
2. Continue with Google as the secondary option at the bottom

Email/password account creation requires:
- name
- email
- password
- confirm password

The form must block account creation when the two password entries do not match.

Sign-in includes a clear Forgot password? action. Password-reset requests always show a generic confirmation so the UI does not reveal whether an email address has an account.

Magic link is deferred for now. Google sign-in plus password recovery keeps the surface simpler while still providing an easy recovery path.



## Guided First Run
For a new OWNER, do not show the full dashboard immediately.

Use real organization data to reveal one next action at a time:

1. No items → “Let’s add your first item”
2. Item exists but stock is zero → “Now add some stock”
3. Once stock exists → unlock the normal home screen immediately
4. Until the first sale happens, show a small optional “Record a sale when you’re ready” helper without blocking anything
5. After the first completed sale → show a brief congratulations

The onboarding must not rely on a dismissible tutorial flag. It should derive progress from real ledger state so it cannot become stale.

During first run:
- hide money summaries, reports, staff management, exports, and other secondary navigation from the main screen
- keep wording short and practical
- show progress such as “Step 1 of 2”
- acknowledge completed milestones with tiny, lightweight celebrations
- never block the underlying workflows or data model

The first sale is never required to finish setup. The normal home experience begins as soon as an item has stock.


## Mobile Readability
The default mobile experience must work for users who prefer larger text without requiring pinch-to-zoom.

Rules:
- default body text should be large and comfortably spaced
- form fields and selects must use at least 16px text
- primary tap targets should be at least 56px tall
- helper text must remain readable and high contrast
- money and stock numbers should stand out clearly
- narrow phones should not squeeze three money values into tiny columns
- preserve browser text scaling; never disable user zoom
- support reduced-motion preferences
- prefer simple visible labels such as “Stock” and “What you have” over inventory jargon when meaning stays clear
- polish must not change ledger, permissions, or workflow behavior


## Daily Summary and History
Home shows a concise daily owner summary:
- Sold today
- Received today
- Still owed
- Expenses today

"Still owed" remains the current outstanding balance across active sales, not only today's sales.

The current Nigeria deployment treats "today" as West Africa Time (UTC+1).

Transaction history is owner-only and uses plain-language rows for sales, stock received, payments, expenses, voids, and corrections. Each row should show the actor and time and expand in place for details rather than forcing the user into a dense table.


## Phone app behavior
School Ledger should remain a simple web app that can be added to a phone Home Screen and opened in standalone mode.

Do not add offline sync or aggressive service-worker caching in V1. Reliability and clarity are more important than pretending to be a native app.

Mobile rules:
- respect phone safe areas/notches
- keep primary controls large and one-hand friendly
- explain camera permission in plain language
- if camera access fails, manual item selection must still work
- critical form buttons should guard against accidental double taps
