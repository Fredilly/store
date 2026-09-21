import { db } from "../../../../lib/db";
import { requireOwner } from "../../../../lib/tenant";

const allowed = new Set(["RETURN", "DAMAGE", "ADJUSTMENT_ADD", "ADJUSTMENT_REMOVE"]);

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const variantId = String(form.get("variant_id") ?? "").trim();
  const action = String(form.get("action") ?? "").trim();
  const quantity = Number.parseInt(String(form.get("quantity") ?? ""), 10);
  const reason = String(form.get("reason") ?? "").trim();

  if (!variantId || !allowed.has(action) || !Number.isInteger(quantity) || quantity <= 0 || !reason) {
    return Response.redirect(new URL("/corrections?error=stock", request.url), 303);
  }

  const database = db();
  const variant = await database
    .prepare("SELECT id FROM product_variants WHERE id = ? AND organization_id = ? AND active = 1")
    .bind(variantId, tenant.orgId)
    .first<{ id: string }>();

  if (!variant) {
    return Response.redirect(new URL("/corrections?error=stock", request.url), 303);
  }

  const movementType = action.startsWith("ADJUSTMENT") ? "ADJUSTMENT" : action;
  const quantityDelta =
    action === "DAMAGE" || action === "ADJUSTMENT_REMOVE" ? -quantity : quantity;
  const movementId = crypto.randomUUID();

  try {
    await database.batch([
      database
        .prepare(
          "INSERT INTO stock_movements (id, organization_id, product_variant_id, movement_type, quantity_delta, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          movementId,
          tenant.orgId,
          variantId,
          movementType,
          quantityDelta,
          reason,
          tenant.userId
        ),
      database
        .prepare(
          "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STOCK_CORRECTED', 'stock_movement', ?, ?)"
        )
        .bind(
          crypto.randomUUID(),
          tenant.orgId,
          tenant.userId,
          movementId,
          JSON.stringify({ variantId, movementType, quantityDelta, reason })
        ),
    ]);
  } catch {
    return Response.redirect(new URL("/corrections?error=stock-balance", request.url), 303);
  }

  return Response.redirect(new URL("/corrections?success=stock", request.url), 303);
}
