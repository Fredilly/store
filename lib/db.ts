import { getCloudflareContext } from "@opennextjs/cloudflare";

export const DEFAULT_ORG_ID = "org_default";

export function db(): D1Database {
  const { env } = getCloudflareContext();
  return (env as unknown as { DB: D1Database }).DB;
}
