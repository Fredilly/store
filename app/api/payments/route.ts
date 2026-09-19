import { DEFAULT_ORG_ID, db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";

export async function POST(request: Request) {
  const form = await request.formData();
  const saleId = String(form.get("sale_id") ?? "");
  const amountMinor = toMinor(form.get("amount"));

  if (!saleId || amountMinor <= 0) {
    return Response.redirect(new URL("/money?error=payment", request.url), 303);
  }

  const database = db();
  const sale = await database
    .prepare(
      `SELECT
        s.total_minor,
        COALESCE(SUM(p.amount_minor), 0) AS paid_minor
      FROM sales s
      LEFT JOIN payments p
        ON p.sale_id = s.id
        AND p.organization_id = s.organization_id
      WHERE s.id = ?
        AND s.organization_id = ?
        AND s.status = 'COMPLETED'
      GROUP BY s.id, s.total_minor`
    )
    .bind(saleId, DEFAULT_ORG_ID)
    .first<{ total_minor: number; paid_minor: number }>();

  if (!sale) {
    return Response.redirect(new URL("/money?error=payment", request.url), 303);
  }

  const balance = Number(sale.total_minor) - Number(sale.paid_minor ?? 0);
  if (amountMinor > balance) {
    return Response.redirect(new URL("/money?error=overpayment", request.url), 303);
  }

  const paymentId = crypto.randomUUID();
  await database.batch([
    database.prepare(
      "INSERT INTO payments (id, organization_id, sale_id, amount_minor) VALUES (?, ?, ?, ?)"
    ).bind(paymentId, DEFAULT_ORG_ID, saleId, amountMinor),
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, 'PAYMENT_RECORDED', 'payment', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      DEFAULT_ORG_ID,
      paymentId,
      JSON.stringify({ saleId, amountMinor })
    ),
  ]);

  return Response.redirect(new URL("/money?paid=1", request.url), 303);
}
