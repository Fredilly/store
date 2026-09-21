import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "./db";

type PlatformEnv = {
  PLATFORM_ADMIN_EMAILS?: string;
};

function configuredAdminEmails() {
  const { env } = getCloudflareContext();
  const runtime = env as PlatformEnv;

  return new Set(
    (runtime.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requirePlatformAdmin() {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });

  if (!session?.user?.email) redirect("/");

  const allowed = configuredAdminEmails();
  if (!allowed.has(session.user.email.trim().toLowerCase())) redirect("/");

  await db()
    .prepare(
      `INSERT INTO platform_admin_audit (
        id, actor_user_id, actor_email, action, metadata_json
      ) VALUES (?, ?, ?, 'PLATFORM_DASHBOARD_VIEWED', ?)`
    )
    .bind(
      crypto.randomUUID(),
      session.user.id,
      session.user.email,
      JSON.stringify({ path: "/admin" })
    )
    .run();

  return session.user;
}
