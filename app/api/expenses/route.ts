import { DEFAULT_ORG_ID, db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";

export async function POST(request: Request) {
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
      "INSERT INTO expenses (id, organization_id, description, amount_minor, category) VALUES (?, ?, ?, ?, ?)"
    ).bind(expenseId, DEFAULT_ORG_ID, description, amountMinor, category || null),
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, 'EXPENSE_RECORDED', 'expense', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      DEFAULT_ORG_ID,
      expenseId,
      JSON.stringify({ description, category, amountMinor })
    ),
  ]);

  return Response.redirect(new URL("/money?expense=1", request.url), 303);
}
