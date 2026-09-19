import { db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";
import { requireOwner } from "../../../lib/tenant";

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const amountMinor = toMinor(form.get("amount"));

  if (!description || amountMinor <= 0) {
    return Response.redirect(new URL("/money?error=expense", request.url), 303);
  }

  const database = db();
  const expenseId = crypto.randomUUID();

  await database.batch([
    database.prepare(
      "INSERT INTO expenses (id, organization_id, description, amount_minor, category, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(expenseId, tenant.orgId, description, amountMinor, category || null, tenant.userId),
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'EXPENSE_RECORDED', 'expense', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      tenant.orgId,
      tenant.userId,
      expenseId,
      JSON.stringify({ description, category, amountMinor })
    ),
  ]);

  return Response.redirect(new URL("/money?expense=1", request.url), 303);
}
