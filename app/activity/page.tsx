import Link from "next/link";
import { db } from "../../lib/db";
import { requirePageOwner } from "../../lib/tenant";

type ActivityRow = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata_json: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: "OWNER" | "STAFF" | null;
};

const eventLabels: Record<string, string> = {
  ORGANIZATION_CREATED: "Created the school",
  PRODUCT_CREATED: "Created an item",
  STOCK_RECEIVED: "Added stock",
  SALE_CREATED: "Recorded a sale",
  PAYMENT_RECORDED: "Recorded a payment",
  EXPENSE_RECORDED: "Recorded an expense",
  STAFF_INVITED: "Invited staff",
  STAFF_INVITE_ACCEPTED: "Accepted a staff invite",
  STAFF_STATUS_CHANGED: "Changed staff access",
  SALE_VOIDED: "Voided a sale",
  PAYMENT_CORRECTED: "Corrected money received",
  STOCK_CORRECTED: "Corrected stock",
};

function describeMetadata(value: string | null) {
  if (!value) return null;

  try {
    const metadata = JSON.parse(value) as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof metadata.name === "string") parts.push(metadata.name);
    if (typeof metadata.customerName === "string" && metadata.customerName) {
      parts.push(`Customer: ${metadata.customerName}`);
    }
    if (typeof metadata.quantity === "number") {
      parts.push(`Qty: ${metadata.quantity}`);
    }
    if (typeof metadata.from === "string" && typeof metadata.to === "string") {
      parts.push(`${metadata.from} → ${metadata.to}`);
    }
    if (typeof metadata.reason === "string" && metadata.reason) {
      parts.push(`Reason: ${metadata.reason}`);
    }
    if (typeof metadata.quantityDelta === "number") {
      parts.push(`Stock change: ${metadata.quantityDelta > 0 ? "+" : ""}${metadata.quantityDelta}`);
    }
    if (typeof metadata.adjustmentMinor === "number") {
      parts.push(`Money correction: ${metadata.adjustmentMinor}`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

export default async function ActivityPage() {
  const tenant = await requirePageOwner();

  const result = await db()
    .prepare(
      `SELECT
        a.id,
        a.event_type,
        a.entity_type,
        a.entity_id,
        a.metadata_json,
        a.created_at,
        u.name AS actor_name,
        u.email AS actor_email,
        m.role AS actor_role
      FROM audit_events a
      LEFT JOIN "user" u ON u.id = a.actor_user_id
      LEFT JOIN organization_members m
        ON m.organization_id = a.organization_id
       AND m.user_id = a.actor_user_id
      WHERE a.organization_id = ?
      ORDER BY a.created_at DESC
      LIMIT 100`
    )
    .bind(tenant.orgId)
    .all<ActivityRow>();

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Activity</p>
        <h1>Activity log</h1>
        <p className="muted">
          Permanent history of important inventory, sales, money, and staff actions.
        </p>
      </div>

      <section className="panel">
        {result.results.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <div className="balanceList">
            {result.results.map((event) => {
              const detail = describeMetadata(event.metadata_json);
              const actor =
                event.actor_name ||
                event.actor_email ||
                "Unknown user";

              return (
                <div className="balanceRow" key={event.id}>
                  <div>
                    <strong>
                      {eventLabels[event.event_type] || event.event_type}
                    </strong>
                    <span>
                      {actor}
                      {event.actor_role ? ` · ${event.actor_role}` : ""}
                    </span>
                    {detail && <span>{detail}</span>}
                    <span>{event.created_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
