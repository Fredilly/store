import { DEFAULT_ORG_ID, db } from "../../../lib/db";
import { toMinor } from "../../../lib/money";

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const variantName = String(form.get("variant_name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const sellingPriceMinor = toMinor(form.get("selling_price"));

  if (!name || sellingPriceMinor <= 0) {
    return Response.redirect(new URL("/stock?error=product", request.url), 303);
  }

  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const database = db();

  await database.batch([
    database.prepare(
      "INSERT INTO products (id, organization_id, name, category) VALUES (?, ?, ?, ?)"
    ).bind(productId, DEFAULT_ORG_ID, name, category || null),
    database.prepare(
      "INSERT INTO product_variants (id, organization_id, product_id, variant_name, selling_price_minor) VALUES (?, ?, ?, ?, ?)"
    ).bind(variantId, DEFAULT_ORG_ID, productId, variantName || null, sellingPriceMinor),
    database.prepare(
      "INSERT INTO audit_events (id, organization_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, 'PRODUCT_CREATED', 'product_variant', ?, ?)"
    ).bind(
      crypto.randomUUID(),
      DEFAULT_ORG_ID,
      variantId,
      JSON.stringify({ name, variantName, sellingPriceMinor })
    ),
  ]);

  return Response.redirect(new URL("/stock?created=1", request.url), 303);
}
