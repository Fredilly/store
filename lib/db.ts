import { env } from "cloudflare:workers";

export const DEFAULT_ORG_ID = "org_default";

export function db(): D1Database {
  return (env as unknown as { DB: D1Database }).DB;
}
