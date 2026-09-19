import { DEFAULT_ORG_ID, db } from "./db";

export type VariantOption = {
  id: string;
  label: string;
  selling_price_minor: number;
  stock: number;
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
