import { db } from "../../../../lib/db";
import { toCsv } from "../../../../lib/csv";
import { requireOwner } from "../../../../lib/tenant";

type ExportKind =
  | "products"
  | "inventory"
  | "stock-movements"
  | "sales"
  | "payments"
  | "expenses"
  | "audit-events";

const allowedKinds = new Set<ExportKind>([
  "products",
  "inventory",
  "stock-movements",
  "sales",
  "payments",
  "expenses",
  "audit-events",
]);

function exportConfig(kind: ExportKind, orgId: string) {
  switch (kind) {
    case "products":
      return {
        filename: "products.csv",
        columns: [
          "product_id",
          "product_name",
          "category",
          "variant_id",
          "variant_name",
          "selling_price_minor",
          "cost_price_minor",
          "active",
        ],
        statement: db()
          .prepare(
            `SELECT
              p.id AS product_id,
              p.name AS product_name,
              p.category,
              v.id AS variant_id,
              v.variant_name,
              v.selling_price_minor,
              v.cost_price_minor,
              v.active
            FROM products p
            JOIN product_variants v
              ON v.product_id = p.id
             AND v.organization_id = p.organization_id
            WHERE p.organization_id = ?
            ORDER BY p.name, v.variant_name`
          )
          .bind(orgId),
      };

    case "inventory":
      return {
        filename: "inventory.csv",
        columns: [
          "variant_id",
          "product_name",
          "variant_name",
          "current_stock",
          "selling_price_minor",
        ],
        statement: db()
          .prepare(
            `SELECT
              v.id AS variant_id,
              p.name AS product_name,
              v.variant_name,
              COALESCE(SUM(m.quantity_delta), 0) AS current_stock,
              v.selling_price_minor
            FROM product_variants v
            JOIN products p
              ON p.id = v.product_id
             AND p.organization_id = v.organization_id
            LEFT JOIN stock_movements m
              ON m.product_variant_id = v.id
             AND m.organization_id = v.organization_id
            WHERE v.organization_id = ?
              AND v.active = 1
            GROUP BY
              v.id,
              p.name,
              v.variant_name,
              v.selling_price_minor
            ORDER BY p.name, v.variant_name`
          )
          .bind(orgId),
      };

    case "stock-movements":
      return {
        filename: "stock-movements.csv",
        columns: [
          "id",
          "product_name",
          "variant_name",
          "movement_type",
          "quantity_delta",
          "unit_cost_minor",
          "related_sale_id",
          "reason",
          "created_by_user_id",
          "created_at",
        ],
        statement: db()
          .prepare(
            `SELECT
              m.id,
              p.name AS product_name,
              v.variant_name,
              m.movement_type,
              m.quantity_delta,
              m.unit_cost_minor,
              m.related_sale_id,
              m.reason,
              m.created_by_user_id,
              m.created_at
            FROM stock_movements m
            JOIN product_variants v
              ON v.id = m.product_variant_id
             AND v.organization_id = m.organization_id
            JOIN products p
              ON p.id = v.product_id
             AND p.organization_id = v.organization_id
            WHERE m.organization_id = ?
            ORDER BY m.created_at DESC, m.id DESC`
          )
          .bind(orgId),
      };

    case "sales":
      return {
        filename: "sales.csv",
        columns: [
          "sale_id",
          "status",
          "customer_name",
          "total_minor",
          "created_by_user_id",
          "created_at",
          "voided_at",
        ],
        statement: db()
          .prepare(
            `SELECT
              id AS sale_id,
              status,
              customer_name,
              total_minor,
              created_by_user_id,
              created_at,
              voided_at
            FROM sales
            WHERE organization_id = ?
            ORDER BY created_at DESC, id DESC`
          )
          .bind(orgId),
      };

    case "payments":
      return {
        filename: "payments.csv",
        columns: [
          "payment_id",
          "sale_id",
          "amount_minor",
          "method",
          "note",
          "received_by_user_id",
          "created_at",
        ],
        statement: db()
          .prepare(
            `SELECT
              id AS payment_id,
              sale_id,
              amount_minor,
              method,
              note,
              received_by_user_id,
              created_at
            FROM payments
            WHERE organization_id = ?
            ORDER BY created_at DESC, id DESC`
          )
          .bind(orgId),
      };

    case "expenses":
      return {
        filename: "expenses.csv",
        columns: [
          "expense_id",
          "description",
          "amount_minor",
          "category",
          "created_by_user_id",
          "created_at",
        ],
        statement: db()
          .prepare(
            `SELECT
              id AS expense_id,
              description,
              amount_minor,
              category,
              created_by_user_id,
              created_at
            FROM expenses
            WHERE organization_id = ?
            ORDER BY created_at DESC, id DESC`
          )
          .bind(orgId),
      };

    case "audit-events":
      return {
        filename: "audit-events.csv",
        columns: [
          "id",
          "actor_user_id",
          "event_type",
          "entity_type",
          "entity_id",
          "metadata_json",
          "created_at",
        ],
        statement: db()
          .prepare(
            `SELECT
              id,
              actor_user_id,
              event_type,
              entity_type,
              entity_id,
              metadata_json,
              created_at
            FROM audit_events
            WHERE organization_id = ?
            ORDER BY created_at DESC, id DESC`
          )
          .bind(orgId),
      };
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { kind } = await context.params;
  if (!allowedKinds.has(kind as ExportKind)) {
    return new Response("Unknown export", { status: 404 });
  }

  const exportKind = kind as ExportKind;
  const database = db();

  await database
    .prepare(
      `INSERT INTO audit_events (
        id,
        organization_id,
        actor_user_id,
        event_type,
        entity_type,
        entity_id,
        metadata_json
      ) VALUES (?, ?, ?, 'DATA_EXPORTED', 'export', ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      tenant.orgId,
      tenant.userId,
      exportKind,
      JSON.stringify({ kind: exportKind })
    )
    .run();

  const config = exportConfig(exportKind, tenant.orgId);
  const result = await config.statement.all<Record<string, unknown>>();
  const csv = toCsv(result.results, config.columns);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${config.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
