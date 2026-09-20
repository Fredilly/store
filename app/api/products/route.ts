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
  const name = String(form.get("name") ?? "").trim();
  const variantName = String(form.get("variant_name") ?? "").trim();
  const barcode = String(form.get("barcode") ?? "").trim();
  const sellingPriceMinor = toMinor(form.get("selling_price"));
  const costPriceMinor = form.get("cost_price") ? toMinor(form.get("cost_price")) : null;
  const startingStock = Number.parseInt(String(form.get("starting_stock") ?? "0"), 10);

  if (
    !name ||
    sellingPriceMinor <= 0 ||
    barcode.length > 256 ||
    !Number.isInteger(startingStock) ||
    startingStock < 0 ||
    (costPriceMinor !== null && costPriceMinor < 0)
  ) {
    return Response.redirect(new URL("/stock?error=product", request.url), 303);
  }

  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const database = db();

  if (barcode) {
    const existingCode = await database
      .prepare(
        "SELECT id FROM scan_codes WHERE organization_id = ? AND code = ? AND active = 1 LIMIT 1"
      )
      .bind(tenant.orgId, barcode)
      .first<{ id: string }>();

    if (existingCode) {
      return Response.redirect(new URL("/stock?error=barcode", request.url), 303);
    }
  }

  const statements = [
    database.prepare(
      "INSERT INTO products (id, organization_id, name) VALUES (?, ?, ?)"
    ).bind(productId, tenant.orgId, name),
    database.prepare(
      "INSERT INTO product_variants (id, organization_id, product_id, variant_name, cost_price_minor, selling_price_minor) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      variantId,
      tenant.orgId,
      productId,
      variantName || null,
      costPriceMinor,
      sellingPriceMinor
    ),
  ];

  if (barcode) {
    statements.push(
      database.prepare(
        "INSERT INTO scan_codes (id, organization_id, product_variant_id, code, code_type) VALUES (?, ?, ?, ?, 'BARCODE')"
      ).bind(crypto.randomUUID(), tenant.orgId, variantId, barcode)
    );
  }

  if (startingStock > 0) {
    const movementId = crypto.randomUUID();

    statements.push(
      database.prepare(
        "INSERT INTO stock_movements (id, organization_id, product_variant_id, movement_type, quantity_delta, unit_cost_minor, created_by_user_id) VALUES (?, ?, ?, 'RECEIVE', ?, ?, ?)"
      ).bind(
        movementId,
        tenant.orgId,
        variantId,
        startingStock,
        costPriceMinor,
        tenant.userId
      ),
      database.prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STOCK_RECEIVED', 'stock_movement', ?, ?)"
      ).bind(
        crypto.randomUUID(),
        tenant.orgId,
        tenant.userId,
        movementId,
        JSON.stringify({
          variantId,
          quantity: startingStock,
          unitCostMinor: costPriceMinor,
          source: "PRODUCT_SETUP",
        })
      )
    );
  }

  statements.push(
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'PRODUCT_CREATED', 'product_variant', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      tenant.orgId,
      tenant.userId,
      variantId,
      JSON.stringify({
        name,
        variantName,
        sellingPriceMinor,
        costPriceMinor,
        startingStock,
        hasBarcode: Boolean(barcode),
      })
    )
  );

  try {
    await database.batch(statements);
  } catch (error) {
    if (barcode) {
      const existingCode = await database
        .prepare(
          "SELECT id FROM scan_codes WHERE organization_id = ? AND code = ? AND active = 1 LIMIT 1"
        )
        .bind(tenant.orgId, barcode)
        .first<{ id: string }>();

      if (existingCode) {
        return Response.redirect(new URL("/stock?error=barcode", request.url), 303);
      }
    }

    throw error;
  }

  return Response.redirect(new URL("/stock?created=1", request.url), 303);
}
