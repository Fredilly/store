import { db } from "../../../../lib/db";
import { requireOwner } from "../../../../lib/tenant";

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const userId = String(form.get("user_id") ?? "");
  const status = String(form.get("status") ?? "");

  if (!userId || (status !== "ACTIVE" && status !== "INACTIVE")) {
    return Response.redirect(new URL("/staff?error=status", request.url), 303);
  }

  const database = db();
  const staff = await database
    .prepare(
      "SELECT user_id, status FROM organization_members WHERE organization_id = ? AND user_id = ? AND role = 'STAFF' LIMIT 1"
    )
    .bind(tenant.orgId, userId)
    .first<{ user_id: string; status: string }>();

  if (!staff) {
    return Response.redirect(new URL("/staff?error=staff", request.url), 303);
  }

  await database.batch([
    database
      .prepare(
        "UPDATE organization_members SET status = ? WHERE organization_id = ? AND user_id = ? AND role = 'STAFF'"
      )
      .bind(status, tenant.orgId, userId),
    database
      .prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STAFF_STATUS_CHANGED', 'organization_member', ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        tenant.orgId,
        tenant.userId,
        userId,
        JSON.stringify({ from: staff.status, to: status })
      ),
  ]);

  return Response.redirect(new URL("/staff?updated=1", request.url), 303);
}
