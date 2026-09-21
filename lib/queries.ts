import { db } from "./db";

export type VariantOption = {
  id: string;
  label: string;
  selling_price_minor: number;
  stock: number;
  category: string | null;
  sale_count: number;
  last_sold_at: string | null;
};

export type OutstandingSale = {
  id: string;
  label: string;
  total_minor: number;
  paid_minor: number;
  balance_minor: number;
  created_at: string;
};

export type CorrectableSale = {
  id: string;
  label: string;
  total_minor: number;
  paid_minor: number;
  created_at: string;
};

export async function listVariants(orgId: string): Promise<VariantOption[]> {
  const result = await db()
    .prepare(
      `SELECT
        v.id,
        CASE
          WHEN v.variant_name IS NULL OR v.variant_name = '' THEN p.name
          ELSE p.name || ' · ' || v.variant_name
        END AS label,
        v.selling_price_minor,
        p.category,
        COALESCE((
          SELECT SUM(m.quantity_delta)
          FROM stock_movements m
          WHERE m.product_variant_id = v.id
            AND m.organization_id = v.organization_id
        ), 0) AS stock,
        COALESCE((
          SELECT COUNT(DISTINCT si.sale_id)
          FROM sale_items si
          JOIN sales s
            ON s.id = si.sale_id
           AND s.organization_id = si.organization_id
          WHERE si.product_variant_id = v.id
            AND si.organization_id = v.organization_id
            AND s.status = 'COMPLETED'
        ), 0) AS sale_count,
        (
          SELECT MAX(s.created_at)
          FROM sale_items si
          JOIN sales s
            ON s.id = si.sale_id
           AND s.organization_id = si.organization_id
          WHERE si.product_variant_id = v.id
            AND si.organization_id = v.organization_id
            AND s.status = 'COMPLETED'
        ) AS last_sold_at
      FROM product_variants v
      JOIN products p
        ON p.id = v.product_id
       AND p.organization_id = v.organization_id
      WHERE v.organization_id = ?
        AND v.active = 1
        AND p.active = 1
      ORDER BY
        CASE WHEN last_sold_at IS NULL THEN 1 ELSE 0 END,
        last_sold_at DESC,
        sale_count DESC,
        p.name,
        v.variant_name`
    )
    .bind(orgId)
    .all<VariantOption>();

  return result.results.map((row) => ({
    ...row,
    stock: Number(row.stock),
    sale_count: Number(row.sale_count),
  }));
}

export async function moneySummary(orgId: string) {
  const row = await db()
    .prepare(
      `SELECT
        COALESCE((SELECT SUM(total_minor) FROM sales WHERE organization_id = ? AND status = 'COMPLETED'), 0) AS sales,
        COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = ?), 0)
          + COALESCE((SELECT SUM(amount_delta_minor) FROM payment_adjustments WHERE organization_id = ?), 0) AS received,
        COALESCE((SELECT SUM(amount_minor) FROM expenses WHERE organization_id = ?), 0) AS expenses`
    )
    .bind(orgId, orgId, orgId, orgId)
    .first<{ sales: number; received: number; expenses: number }>();

  const sales = Number(row?.sales ?? 0);
  const received = Number(row?.received ?? 0);
  const expenses = Number(row?.expenses ?? 0);

  return {
    sales,
    received,
    outstanding: Math.max(0, sales - received),
    expenses,
  };
}

export async function listOutstandingSales(orgId: string): Promise<OutstandingSale[]> {
  const result = await db()
    .prepare(
      `SELECT
        s.id,
        CASE
          WHEN s.customer_name IS NOT NULL AND s.customer_name <> '' THEN s.customer_name || ' · '
          ELSE ''
        END ||
        COALESCE(GROUP_CONCAT(
          CASE
            WHEN v.variant_name IS NULL OR v.variant_name = '' THEN p.name
            ELSE p.name || ' · ' || v.variant_name
          END,
          ', '
        ), 'Sale') AS label,
        s.total_minor,
        COALESCE(pay.paid_minor, 0) + COALESCE(adj.adjusted_minor, 0) AS paid_minor,
        s.total_minor - (COALESCE(pay.paid_minor, 0) + COALESCE(adj.adjusted_minor, 0)) AS balance_minor,
        s.created_at
      FROM sales s
      JOIN sale_items si
        ON si.sale_id = s.id
        AND si.organization_id = s.organization_id
      JOIN product_variants v ON v.id = si.product_variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN (
        SELECT sale_id, organization_id, SUM(amount_minor) AS paid_minor
        FROM payments
        GROUP BY sale_id, organization_id
      ) pay
        ON pay.sale_id = s.id
        AND pay.organization_id = s.organization_id
      LEFT JOIN (
        SELECT sale_id, organization_id, SUM(amount_delta_minor) AS adjusted_minor
        FROM payment_adjustments
        GROUP BY sale_id, organization_id
      ) adj
        ON adj.sale_id = s.id
        AND adj.organization_id = s.organization_id
      WHERE s.organization_id = ?
        AND s.status = 'COMPLETED'
      GROUP BY s.id, s.customer_name, s.total_minor, pay.paid_minor, adj.adjusted_minor, s.created_at
      HAVING s.total_minor - (COALESCE(pay.paid_minor, 0) + COALESCE(adj.adjusted_minor, 0)) > 0
      ORDER BY s.created_at DESC
      LIMIT 50`
    )
    .bind(orgId)
    .all<OutstandingSale>();

  return result.results.map((row) => ({
    ...row,
    total_minor: Number(row.total_minor),
    paid_minor: Number(row.paid_minor),
    balance_minor: Number(row.balance_minor),
  }));
}

export async function listCorrectableSales(orgId: string): Promise<CorrectableSale[]> {
  const result = await db()
    .prepare(
      `SELECT
        s.id,
        CASE
          WHEN s.customer_name IS NOT NULL AND s.customer_name <> '' THEN s.customer_name || ' · '
          ELSE ''
        END ||
        COALESCE(GROUP_CONCAT(
          CASE
            WHEN v.variant_name IS NULL OR v.variant_name = '' THEN p.name
            ELSE p.name || ' · ' || v.variant_name
          END,
          ', '
        ), 'Sale') AS label,
        s.total_minor,
        COALESCE(pay.paid_minor, 0) + COALESCE(adj.adjusted_minor, 0) AS paid_minor,
        s.created_at
      FROM sales s
      JOIN sale_items si
        ON si.sale_id = s.id
        AND si.organization_id = s.organization_id
      JOIN product_variants v ON v.id = si.product_variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN (
        SELECT sale_id, organization_id, SUM(amount_minor) AS paid_minor
        FROM payments
        GROUP BY sale_id, organization_id
      ) pay
        ON pay.sale_id = s.id
        AND pay.organization_id = s.organization_id
      LEFT JOIN (
        SELECT sale_id, organization_id, SUM(amount_delta_minor) AS adjusted_minor
        FROM payment_adjustments
        GROUP BY sale_id, organization_id
      ) adj
        ON adj.sale_id = s.id
        AND adj.organization_id = s.organization_id
      WHERE s.organization_id = ?
        AND s.status = 'COMPLETED'
      GROUP BY s.id, s.customer_name, s.total_minor, pay.paid_minor, adj.adjusted_minor, s.created_at
      ORDER BY s.created_at DESC
      LIMIT 50`
    )
    .bind(orgId)
    .all<CorrectableSale>();

  return result.results.map((row) => ({
    ...row,
    total_minor: Number(row.total_minor),
    paid_minor: Number(row.paid_minor),
  }));
}

export type OnboardingProgress = {
  productCount: number;
  stockUnits: number;
  saleCount: number;
};

export async function onboardingProgress(orgId: string): Promise<OnboardingProgress> {
  const row = await db()
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM product_variants WHERE organization_id = ? AND active = 1) AS product_count,
        COALESCE((
          SELECT SUM(quantity_delta)
          FROM stock_movements
          WHERE organization_id = ?
        ), 0) AS stock_units,
        (SELECT COUNT(*) FROM sales WHERE organization_id = ? AND status = 'COMPLETED') AS sale_count`
    )
    .bind(orgId, orgId, orgId)
    .first<{ product_count: number; stock_units: number; sale_count: number }>();

  return {
    productCount: Number(row?.product_count ?? 0),
    stockUnits: Number(row?.stock_units ?? 0),
    saleCount: Number(row?.sale_count ?? 0),
  };
}


export type DailySummary = {
  sales: number;
  received: number;
  outstanding: number;
  expenses: number;
};

export async function dailySummary(orgId: string): Promise<DailySummary> {
  const row = await db()
    .prepare(
      `SELECT
        COALESCE((
          SELECT SUM(total_minor)
          FROM sales
          WHERE organization_id = ?
            AND status = 'COMPLETED'
            AND date(created_at, '+1 hour') = date('now', '+1 hour')
        ), 0) AS sales,
        COALESCE((
          SELECT SUM(amount_minor)
          FROM payments
          WHERE organization_id = ?
            AND date(created_at, '+1 hour') = date('now', '+1 hour')
        ), 0)
        + COALESCE((
          SELECT SUM(amount_delta_minor)
          FROM payment_adjustments
          WHERE organization_id = ?
            AND date(created_at, '+1 hour') = date('now', '+1 hour')
        ), 0) AS received,
        COALESCE((
          SELECT SUM(amount_minor)
          FROM expenses
          WHERE organization_id = ?
            AND date(created_at, '+1 hour') = date('now', '+1 hour')
        ), 0) AS expenses,
        COALESCE((
          SELECT SUM(total_minor)
          FROM sales
          WHERE organization_id = ?
            AND status = 'COMPLETED'
        ), 0)
        - (
          COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = ?), 0)
          + COALESCE((SELECT SUM(amount_delta_minor) FROM payment_adjustments WHERE organization_id = ?), 0)
        ) AS outstanding`
    )
    .bind(orgId, orgId, orgId, orgId, orgId, orgId, orgId)
    .first<DailySummary>();

  return {
    sales: Number(row?.sales ?? 0),
    received: Number(row?.received ?? 0),
    outstanding: Math.max(0, Number(row?.outstanding ?? 0)),
    expenses: Number(row?.expenses ?? 0),
  };
}

export type RecentTransaction = {
  id: string;
  event_type: string;
  entity_id: string;
  metadata_json: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};

export async function listRecentTransactions(orgId: string): Promise<RecentTransaction[]> {
  const result = await db()
    .prepare(
      `SELECT
        a.id,
        a.event_type,
        a.entity_id,
        a.metadata_json,
        a.created_at,
        u.name AS actor_name,
        u.email AS actor_email
      FROM audit_events a
      LEFT JOIN "user" u ON u.id = a.actor_user_id
      WHERE a.organization_id = ?
        AND a.event_type IN (
          'SALE_CREATED',
          'SALE_VOIDED',
          'STOCK_RECEIVED',
          'STOCK_CORRECTED',
          'PAYMENT_RECORDED',
          'PAYMENT_CORRECTED',
          'EXPENSE_RECORDED'
        )
      ORDER BY a.created_at DESC
      LIMIT 100`
    )
    .bind(orgId)
    .all<RecentTransaction>();

  return result.results;
}
