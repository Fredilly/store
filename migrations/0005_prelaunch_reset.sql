-- One-time pre-launch reset.
-- This migration intentionally clears all current application and auth data.
-- It runs once through Wrangler's D1 migration tracking.

DELETE FROM verification;
DELETE FROM session;
DELETE FROM account;
DELETE FROM staff_invites;
DELETE FROM audit_events;
DELETE FROM payments;
DELETE FROM sale_items;
DELETE FROM stock_movements;
DELETE FROM sales;
DELETE FROM expenses;
DELETE FROM scan_codes;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM organization_members;
DELETE FROM organizations;
DELETE FROM "user";
