import { DEFAULT_ORG_ID, db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";

type VariantRow = {
  id: string;
  selling_price_minor: number;
  stock: number;
};

export async function POST(request: Request) {
  const form = await request.formData();
  const variantId = String(form.get("variant_id") ?? "");
  const quantity = Number.parseInt(String(form.get("quantity") ?? "1"), 10);
  const customerName = String(form.get("customer_name") ?? "").trim();

  if (!variantId || !Number.isInteger(quantity) || quantity <= 0) {
    return Response.redirect(new URL("/sell?error=invalid", request.url), 303);
  }

  const database = db();
  const variant = await database
    .prepare(
      `SELECT
        v.id,
        v.selling_price_minor,
        COALESCE(SUM(m.quantity_delta), 0) AS stock
      FROM product_variants v
      LEFT JOIN stock_movements m
        ON m.product_variant_id = v.id
        AND m.organization_id = v.organization_id
      WHERE v.id = ?
        AND v.organization_id = ?
        AND v.active = 1
      GROUP BY v.id, v.selling_price_minor`
    )
    .bind(variantId, DEFAULT_ORG_ID)
    .first<VariantRow>();

  if (!variant || Number(variant.stock) < quantity) {
    return Response.redirect(new URL("/sell?error=stock", request.url), 303);
  }

  const totalMinor = variant.selling_price_minor * quantity;
  const amountPaidMinor = form.get("amount_paid")
    ? toMinor(form.get("amount_paid"))
    : totalMinor;

  if (amountPaidMinor > totalMinor) {
    return Response.redirect(new URL("/sell?error=payment", request.url), 303);
  }

  const saleId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const movementId = crypto.randomUUID();

  const statements = [
    database.prepare(
      "INSERT INTO sales (id, organization_id, total_minor, customer_name) VALUES (?, ?, ?, ?)"
    ).bind(saleId, DEFAULT_ORG_ID, totalMinor, customerName || null),
    database.prepare(
      "INSERT INTO sale_items (id, organization_id, sale_id, product_variant_id, quantity, unit_price_minor, line_total_minor) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      itemId,
      DEFAULT_ORG_ID,
      saleId,
      variantId,
      quantity,
      variant.selling_price_minor,
      totalMinor
    ),
    database.prepare(
      "INSERT INTO stock_movements (id, organization_id, product_variant_id, movement_type, quantity_delta, related_sale_id) VALUES (?, ?, ?, 'SALE', ?, ?)"
    ).bind(movementId, DEFAULT_ORG_ID, variantId, -quantity, saleId),
  ];

  if (amountPaidMinor > 0) {
    statements.push(
      database.prepare(
        "INSERT INTO payments (id, organization_id, sale_id, amount_minor) VALUES (?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), DEFAULT_ORG_ID, saleId, amountPaidMinor)
    );
  }

  statements.push(
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, 'SALE_CREATED', 'sale', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      DEFAULT_ORG_ID,
      saleId,
      JSON.stringify({ variantId, quantity, totalMinor, amountPaidMinor, customerName })
    )
  );

  await database.batch(statements);

  return Response.redirect(new URL("/sell?saved=1", request.url), 303);
}
