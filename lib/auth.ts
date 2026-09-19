import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";

type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
};

const runtime = env as unknown as AuthEnv;

export const auth = betterAuth({
  database: runtime.DB,
  secret:
    runtime.BETTER_AUTH_SECRET ??
    "development-only-secret-change-before-real-use-123456",
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export function isAuthConfigured() {
  return Boolean(runtime.BETTER_AUTH_SECRET);
}
