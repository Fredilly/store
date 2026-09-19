import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";

export type Tenant = {
  userId: string;
  userName: string;
  orgId: string;
  orgName: string;
  role: "OWNER" | "STAFF";
};

export async function getTenant(requestHeaders: Headers): Promise<Tenant | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const membership = await db()
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
    .bind(session.user.id)
    .first<{ orgId: string; orgName: string; role: "OWNER" | "STAFF" }>();

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

export async function requirePageTenant(): Promise<Tenant> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect("/login");

  const tenant = await getTenant(requestHeaders);
  if (!tenant) redirect("/setup");

  return tenant;
}
