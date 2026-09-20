import { db } from "../../../../lib/db";
import { sendStaffInviteEmail } from "../../../../lib/email";
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
    return Response.redirect(new URL("/staff?error=member", request.url), 303);
  }

  const existingInvite = await database
    .prepare(
      `SELECT id
      FROM staff_invites
      WHERE organization_id = ?
        AND email = ?
        AND status = 'PENDING'
      LIMIT 1`
    )
    .bind(tenant.orgId, email)
    .first<{ id: string }>();

  if (existingInvite) {
    return Response.redirect(new URL("/staff?error=pending", request.url), 303);
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
    return Response.redirect(new URL("/staff?error=invite", request.url), 303);
  }

  const emailSent = await sendStaffInviteEmail({
    name,
    email,
    organizationName: tenant.orgName,
  });

  const resultUrl = new URL("/staff", request.url);
  resultUrl.searchParams.set("invited", "1");
  if (!emailSent) resultUrl.searchParams.set("mail", "failed");

  return Response.redirect(resultUrl, 303);
}
