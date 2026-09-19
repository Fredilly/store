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
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  if (!name || !email || !email.includes("@") || email.length > 320) {
    return Response.redirect(new URL("/staff?error=invite", request.url), 303);
  }

  const database = db();
  const existingMember = await database
    .prepare(
      `SELECT m.user_id
      FROM organization_members m
      JOIN "user" u ON u.id = m.user_id
      WHERE m.organization_id = ?
        AND lower(u.email) = ?
      LIMIT 1`
    )
    .bind(tenant.orgId, email)
    .first<{ user_id: string }>();

  if (existingMember) {
    return Response.redirect(new URL("/staff?error=exists", request.url), 303);
  }

  const inviteId = crypto.randomUUID();

  try {
    await database.batch([
      database
        .prepare(
          "INSERT INTO staff_invites (id, organization_id, email, name, invited_by_user_id) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(inviteId, tenant.orgId, email, name, tenant.userId),
      database
        .prepare(
          "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STAFF_INVITED', 'staff_invite', ?, ?)"
        )
        .bind(
          crypto.randomUUID(),
          tenant.orgId,
          tenant.userId,
          inviteId,
          JSON.stringify({ name, email, role: "STAFF" })
        ),
    ]);
  } catch {
    return Response.redirect(new URL("/staff?error=pending", request.url), 303);
  }

  return Response.redirect(new URL("/staff?invited=1", request.url), 303);
}
