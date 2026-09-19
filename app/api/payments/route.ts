import { db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";
import { requireTenant } from "../../../lib/tenant";

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireTenant(request.headers);
  } catch {
    return Response.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const saleId = String(form.get("sale_id") ?? "");
  const amountMinor = toMinor(form.get("amount"));
  const submissionKey = String(form.get("submission_key") ?? "").trim();

  if (!saleId || !submissionKey || submissionKey.length > 128 || amountMinor <= 0) {
    return Response.redirect(new URL("/money?error=payment", request.url), 303);
  }

  const database = db();
  const existingPayment = await database
    .prepare(
      "SELECT id FROM payments WHERE organization_id = ? AND submission_key = ? LIMIT 1"
    )
    .bind(tenant.orgId, submissionKey)
    .first<{ id: string }>();

  if (existingPayment) {
    return Response.redirect(new URL("/money?paid=1", request.url), 303);
  }

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
    .bind(saleId, tenant.orgId)
    .first<{ total_minor: number; paid_minor: number }>();

  if (!sale) {
    return Response.redirect(new URL("/money?error=payment", request.url), 303);
  }

  const balance = Number(sale.total_minor) - Number(sale.paid_minor ?? 0);
  if (amountMinor > balance) {
    return Response.redirect(new URL("/money?error=overpayment", request.url), 303);
  }

  const paymentId = crypto.randomUUID();

  try {
    await database.batch([
      database.prepare(
        "INSERT INTO payments (id, organization_id, sale_id, amount_minor, received_by_user_id, submission_key) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        paymentId,
        tenant.orgId,
        saleId,
        amountMinor,
        tenant.userId,
        submissionKey
      ),
      database.prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'PAYMENT_RECORDED', 'payment', ?, ?)"
      ).bind(
        crypto.randomUUID(),
        tenant.orgId,
        tenant.userId,
        paymentId,
        JSON.stringify({ saleId, amountMinor })
      ),
    ]);
  } catch (error) {
    const duplicate = await database
      .prepare(
        "SELECT id FROM payments WHERE organization_id = ? AND submission_key = ? LIMIT 1"
      )
      .bind(tenant.orgId, submissionKey)
      .first<{ id: string }>();

    if (!duplicate) throw error;
  }

  return Response.redirect(new URL("/money?paid=1", request.url), 303);
}
