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
  const variantId = String(form.get("variant_id") ?? "");
  const quantity = Number.parseInt(String(form.get("quantity") ?? ""), 10);
  const unitCostMinor = form.get("unit_cost") ? toMinor(form.get("unit_cost")) : null;

  if (!variantId || !Number.isInteger(quantity) || quantity <= 0) {
    return Response.redirect(new URL("/stock?error=stock", request.url), 303);
  }

  const database = db();
  const variant = await database
    .prepare(
      "SELECT id FROM product_variants WHERE id = ? AND organization_id = ? AND active = 1"
    )
    .bind(variantId, tenant.orgId)
    .first<{ id: string }>();

  if (!variant) {
    return Response.redirect(new URL("/stock?error=product", request.url), 303);
  }

  const movementId = crypto.randomUUID();

  await database.batch([
    database.prepare(
      "INSERT INTO stock_movements (id, organization_id, product_variant_id, movement_type, quantity_delta, unit_cost_minor, created_by_user_id) VALUES (?, ?, ?, 'RECEIVE', ?, ?, ?)"
    ).bind(movementId, tenant.orgId, variantId, quantity, unitCostMinor, tenant.userId),
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STOCK_RECEIVED', 'stock_movement', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      tenant.orgId,
      tenant.userId,
      movementId,
      JSON.stringify({ variantId, quantity, unitCostMinor })
    ),
  ]);

  return Response.redirect(new URL("/stock?saved=1", request.url), 303);
}
