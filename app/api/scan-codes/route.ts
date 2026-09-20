import { db } from "../../../lib/db";
import { requireTenant } from "../../../lib/tenant";

type ScanCodeRow = {
  variant_id: string;
  label: string;
  stock: number;
};

export async function GET(request: Request) {
  let tenant;
  try {
    tenant = await requireTenant(request.headers);
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code || code.length > 256) {
    return Response.json({ found: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const row = await db()
    .prepare(
      `SELECT
        sc.product_variant_id AS variant_id,
        CASE
          WHEN v.variant_name IS NULL OR v.variant_name = '' THEN p.name
          ELSE p.name || ' · ' || v.variant_name
        END AS label,
        COALESCE(SUM(m.quantity_delta), 0) AS stock
      FROM scan_codes sc
      JOIN product_variants v
        ON v.id = sc.product_variant_id
        AND v.organization_id = sc.organization_id
      JOIN products p
        ON p.id = v.product_id
        AND p.organization_id = sc.organization_id
      LEFT JOIN stock_movements m
        ON m.product_variant_id = v.id
        AND m.organization_id = sc.organization_id
      WHERE sc.organization_id = ?
        AND sc.code = ?
        AND sc.active = 1
        AND v.active = 1
        AND p.active = 1
      GROUP BY sc.product_variant_id, p.name, v.variant_name
      LIMIT 1`
    )
    .bind(tenant.orgId, code)
    .first<ScanCodeRow>();

  if (!row) {
    return Response.json({ found: false }, { headers: { "Cache-Control": "no-store" } });
  }

  return Response.json(
    {
      found: true,
      variantId: row.variant_id,
      label: row.label,
      stock: Number(row.stock),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
