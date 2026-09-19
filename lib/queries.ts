import { DEFAULT_ORG_ID, db } from "./db";

export type VariantOption = {
  id: string;
  label: string;
  selling_price_minor: number;
  stock: number;
};

export type OutstandingSale = {
  id: string;
  label: string;
  total_minor: number;
  paid_minor: number;
  balance_minor: number;
  created_at: string;
};

export async function listVariants(): Promise<VariantOption[]> {
  const result = await db()
    .prepare(
      `SELECT
        v.id,
        CASE
          WHEN v.variant_name IS NULL OR v.variant_name = '' THEN p.name
          ELSE p.name || ' · ' || v.variant_name
        END AS label,
        v.selling_price_minor,
        COALESCE(SUM(m.quantity_delta), 0) AS stock
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      LEFT JOIN stock_movements m
        ON m.product_variant_id = v.id
        AND m.organization_id = v.organization_id
      WHERE v.organization_id = ?
        AND v.active = 1
        AND p.active = 1
      GROUP BY v.id, p.name, v.variant_name, v.selling_price_minor
      ORDER BY p.name, v.variant_name`
    )
    .bind(DEFAULT_ORG_ID)
    .all<VariantOption>();

  return result.results.map((row) => ({ ...row, stock: Number(row.stock) }));
}

export async function moneySummary() {
  const row = await db()
    .prepare(
      `SELECT
        COALESCE((SELECT SUM(total_minor) FROM sales WHERE organization_id = ? AND status = 'COMPLETED'), 0) AS sales,
        COALESCE((SELECT SUM(amount_minor) FROM payments WHERE organization_id = ?), 0) AS received,
        COALESCE((SELECT SUM(amount_minor) FROM expenses WHERE organization_id = ?), 0) AS expenses`
    )
    .bind(DEFAULT_ORG_ID, DEFAULT_ORG_ID, DEFAULT_ORG_ID)
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

export async function listOutstandingSales(): Promise<OutstandingSale[]> {
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
        COALESCE(pay.paid_minor, 0) AS paid_minor,
        s.total_minor - COALESCE(pay.paid_minor, 0) AS balance_minor,
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
      WHERE s.organization_id = ?
        AND s.status = 'COMPLETED'
      GROUP BY s.id, s.customer_name, s.total_minor, pay.paid_minor, s.created_at
      HAVING s.total_minor - COALESCE(pay.paid_minor, 0) > 0
      ORDER BY s.created_at DESC
      LIMIT 50`
    )
    .bind(DEFAULT_ORG_ID)
    .all<OutstandingSale>();

  return result.results.map((row) => ({
    ...row,
    total_minor: Number(row.total_minor),
    paid_minor: Number(row.paid_minor),
    balance_minor: Number(row.balance_minor),
  }));
}
