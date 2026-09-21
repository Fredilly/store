import { db } from "../../../../lib/db";
import { toMinor } from "../../../../lib/money";
import { requireOwner } from "../../../../lib/tenant";

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const saleId = String(form.get("sale_id") ?? "").trim();
  const amountMinor = toMinor(form.get("amount"));
  const reason = String(form.get("reason") ?? "").trim();

  if (!saleId || amountMinor <= 0 || !reason) {
    return Response.redirect(new URL("/corrections?error=payment", request.url), 303);
  }

  const database = db();
  const sale = await database
    .prepare(
      `SELECT
        s.id,
        s.status,
        COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.organization_id = s.organization_id AND p.sale_id = s.id), 0)
        + COALESCE((SELECT SUM(a.amount_delta_minor) FROM payment_adjustments a WHERE a.organization_id = s.organization_id AND a.sale_id = s.id), 0)
        AS paid_minor
      FROM sales s
      WHERE s.id = ?
        AND s.organization_id = ?`
    )
    .bind(saleId, tenant.orgId)
    .first<{ id: string; status: string; paid_minor: number }>();

  const paidMinor = Number(sale?.paid_minor ?? 0);
  if (!sale || sale.status !== "COMPLETED" || amountMinor > paidMinor) {
    return Response.redirect(new URL("/corrections?error=payment", request.url), 303);
  }

  const adjustmentId = crypto.randomUUID();
  await database.batch([
    database
      .prepare(
        "INSERT INTO payment_adjustments (id, organization_id, sale_id, amount_delta_minor, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(adjustmentId, tenant.orgId, saleId, -amountMinor, reason, tenant.userId),
    database
      .prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'PAYMENT_CORRECTED', 'payment_adjustment', ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        tenant.orgId,
        tenant.userId,
        adjustmentId,
        JSON.stringify({
          saleId,
          reason,
          previousPaidMinor: paidMinor,
          adjustmentMinor: -amountMinor,
          newPaidMinor: paidMinor - amountMinor,
        })
      ),
  ]);

  return Response.redirect(new URL("/corrections?success=payment", request.url), 303);
}
