import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { db } from "./db";

export type Tenant = {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  role: "OWNER" | "STAFF";
};

async function findMembership(userId: string) {
  return db()
    .prepare(
      `SELECT
        m.organization_id AS orgId,
        m.role AS role,
        o.name AS orgName
      FROM organization_members m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.user_id = ?
        AND m.status = 'ACTIVE'
      ORDER BY CASE WHEN m.role = 'OWNER' THEN 0 ELSE 1 END
      LIMIT 1`
    )
    .bind(userId)
    .first<{ orgId: string; orgName: string; role: "OWNER" | "STAFF" }>();
}

export async function getTenant(requestHeaders: Headers): Promise<Tenant | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  let membership = await findMembership(session.user.id);

  if (!membership && session.user.email) {
    const email = session.user.email.trim().toLowerCase();
    const invite = await db()
      .prepare(
        `SELECT
          i.id,
          i.organization_id AS orgId,
          o.name AS orgName
        FROM staff_invites i
        JOIN organizations o ON o.id = i.organization_id
        WHERE i.email = ?
          AND i.status = 'PENDING'
        ORDER BY i.created_at ASC
        LIMIT 1`
      )
      .bind(email)
      .first<{ id: string; orgId: string; orgName: string }>();

    if (invite) {
      const database = db();
      await database.batch([
        database
          .prepare(
            "INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, status) VALUES (?, ?, 'STAFF', 'ACTIVE')"
          )
          .bind(invite.orgId, session.user.id),
        database
          .prepare(
            "UPDATE staff_invites SET status = 'ACCEPTED', accepted_by_user_id = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'PENDING'"
          )
          .bind(session.user.id, invite.id),
        database
          .prepare(
            "INSERT INTO audit_events (id, organization_id, actor_user_id, event_type, entity_type, entity_id, metadata_json) VALUES (?, ?, ?, 'STAFF_INVITE_ACCEPTED', 'staff_invite', ?, ?)"
          )
          .bind(
            crypto.randomUUID(),
            invite.orgId,
            session.user.id,
            invite.id,
            JSON.stringify({ email })
          ),
      ]);

      membership = {
        orgId: invite.orgId,
        orgName: invite.orgName,
        role: "STAFF",
      };
    }
  }

  if (!membership) return null;

  return {
    userId: session.user.id,
    userName: session.user.name,
    orgId: membership.orgId,
    orgName: membership.orgName,
    role: membership.role,
  };
}

export async function requireTenant(requestHeaders: Headers): Promise<Tenant> {
  const tenant = await getTenant(requestHeaders);
  if (!tenant) throw new Error("AUTH_REQUIRED");
  return tenant;
}

export async function requireOwner(requestHeaders: Headers): Promise<Tenant> {
  const tenant = await requireTenant(requestHeaders);
  if (tenant.role !== "OWNER") throw new Error("FORBIDDEN");
  return tenant;
}

export async function requirePageTenant(): Promise<Tenant> {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });

  if (!session) redirect("/login");

  const tenant = await getTenant(requestHeaders);
  if (!tenant) redirect("/setup");

  return tenant;
}

export async function requirePageOwner(): Promise<Tenant> {
  const tenant = await requirePageTenant();
  if (tenant.role !== "OWNER") redirect("/");
  return tenant;
}
