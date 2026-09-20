import { getAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";

export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.redirect(new URL("/login", request.url), 303);
  }

  const database = db();
  const existing = await database
    .prepare(
      "SELECT organization_id FROM organization_members WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1"
    )
    .bind(session.user.id)
    .first<{ organization_id: string }>();

  if (existing) {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const invited = await database
    .prepare(
      "SELECT id FROM staff_invites WHERE email = ? AND status = 'PENDING' LIMIT 1"
    )
    .bind(session.user.email.trim().toLowerCase())
    .first<{ id: string }>();

  if (invited) {
    return Response.redirect(new URL("/", request.url), 303);
  }

  const form = await request.formData();
  const schoolName = String(form.get("school_name") ?? "").trim();

  if (!schoolName) {
    return Response.redirect(new URL("/setup?error=name", request.url), 303);
  }

  const organizationId = crypto.randomUUID();

  await database.batch([
    database
      .prepare(
        "INSERT INTO organizations (id, name, currency) VALUES (?, ?, 'NGN')"
      )
      .bind(organizationId, schoolName),
    database
      .prepare(
        "INSERT INTO organization_members (organization_id, user_id, role, status) VALUES (?, ?, 'OWNER', 'ACTIVE')"
      )
      .bind(organizationId, session.user.id),
    database
      .prepare(
        "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'ORGANIZATION_CREATED', 'organization', ?, ?)"
      )
      .bind(
        crypto.randomUUID(),
        organizationId,
        session.user.id,
        organizationId,
        JSON.stringify({ name: schoolName })
      ),
  ]);

  return Response.redirect(new URL("/", request.url), 303);
}
