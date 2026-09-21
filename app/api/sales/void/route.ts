import { db } from "../../../../lib/db";
import { requireOwner } from "../../../../lib/tenant";

type SaleItemRow = {
  product_variant_id: string;
  quantity: number;
};

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const saleId = String(form.get("sale_id") ?? "").trim();
  const reason = String(form.get("reason") ?? "").trim();

  if (!saleId || !reason) {
    return Response.redirect(new URL("/corrections?error=void", request.url), 303);
  }

  const database = db();
  const sale = await database
    .prepare(
      `SELECT
        s.id,
        s.status,
        s.total_minor,
        COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.organization_id = s.organization_id AND p.sale_id = s.id), 0)
        + COALESCE((SELECT SUM(a.amount_delta_minor) FROM payment_adjustments a WHERE a.organization_id = s.organization_id AND a.sale_id = s.id), 0)
        AS paid_minor
      FROM sales s
      WHERE s.id = ?
        AND s.organization_id = ?`
    )
    .bind(saleId, tenant.orgId)
    .first<{ id: string; status: string; total_minor: number; paid_minor: number }>();

  if (!sale || sale.status !== "COMPLETED") {
    return Response.redirect(new URL("/corrections?error=void", request.url), 303);
  }

  const items = await database
    .prepare(
      `SELECT product_variant_id, quantity
       FROM sale_items
       WHERE sale_id = ?
         AND organization_id = ?`
    )
    .bind(saleId, tenant.orgId)
    .all<SaleItemRow>();

  if (items.results.length === 0) {
    return Response.redirect(new URL("/corrections?error=void", request.url), 303);
  }

  const paidMinor = Number(sale.paid_minor ?? 0);
  const statements = [
    database
      .prepare(
        "UPDATE sales SET status = 'VOIDED', voided_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ? AND status = 'COMPLETED'"
      )
      .bind(saleId, tenant.orgId),
  ];

  for (const item of items.results) {
    statements.push(
      database
        .prepare(
          "INSERT INTO stock_movements (id, organization_id, product_variant_id, movement_type, quantity_delta, related_sale_id, reason, created_by_user_id) VALUES (?, ?, ?, 'VOID_REVERSAL', ?, ?, ?, ?)"
        )
        .bind(
          crypto.randomUUID(),
          tenant.orgId,
          item.product_variant_id,
          Number(item.quantity),
          saleId,
          reason,
          tenant.userId
        )
    );
  }

  if (paidMinor !== 0) {
    statements.push(
      database
        .prepare(
          "INSERT INTO payment_adjustments (id, organization_id, sale_id, amount_delta_minor, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(
          crypto.randomUUID(),
          tenant.orgId,
          saleId,
          -paidMinor,
          `Sale voided: ${reason}`,
          tenant.userId
        )
    );
  }

  statements.push(
    database
      .prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'SALE_VOIDED', 'sale', ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        tenant.orgId,
        tenant.userId,
        saleId,
        JSON.stringify({
          reason,
          previousStatus: sale.status,
          newStatus: "VOIDED",
          totalMinor: Number(sale.total_minor),
          reversedPaymentMinor: paidMinor,
          returnedUnits: items.results.reduce((sum, item) => sum + Number(item.quantity), 0),
        })
      )
  );

  await database.batch(statements);

  return Response.redirect(new URL("/corrections?success=void", request.url), 303);
}
