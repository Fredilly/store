import { db } from "../../../../../lib/db";
import { sendStaffInviteEmail } from "../../../../../lib/email";
import { requireOwner } from "../../../../../lib/tenant";

export async function POST(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const inviteId = String(form.get("invite_id") ?? "").trim();

  if (!inviteId) {
    return Response.redirect(new URL("/staff?error=resend", request.url), 303);
  }

  const invite = await db()
    .prepare(
      `SELECT id, name, email
      FROM staff_invites
      WHERE id = ?
        AND organization_id = ?
        AND status = 'PENDING'
      LIMIT 1`
    )
    .bind(inviteId, tenant.orgId)
    .first<{ id: string; name: string; email: string }>();

  if (!invite) {
    return Response.redirect(new URL("/staff?error=resend", request.url), 303);
  }

  const sent = await sendStaffInviteEmail({
    name: invite.name,
    email: invite.email,
    organizationName: tenant.orgName,
  });

  return Response.redirect(
    new URL(sent ? "/staff?resent=1" : "/staff?error=resend", request.url),
    303
  );
}
