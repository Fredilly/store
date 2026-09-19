import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";
import { queuePasswordResetEmail, queueWelcomeEmail } from "./email";

type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

const runtime = env as unknown as AuthEnv;

const googleConfigured = Boolean(
  runtime.GOOGLE_CLIENT_ID && runtime.GOOGLE_CLIENT_SECRET
);

const trustedOrigins = Array.from(
  new Set(
    [
      runtime.BETTER_AUTH_URL,
      "https://store.article6.org",
      "https://store.fredilly.workers.dev",
      "http://localhost:3000",
    ].filter((value): value is string => Boolean(value))
  )
);

export const auth = betterAuth({
  database: runtime.DB,
  baseURL: runtime.BETTER_AUTH_URL,
  trustedOrigins,
  secret:
    runtime.BETTER_AUTH_SECRET ??
    "development-only-secret-change-before-real-use-123456",
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      queuePasswordResetEmail(user, url);
    },
  },
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: runtime.GOOGLE_CLIENT_ID!,
          clientSecret: runtime.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          queueWelcomeEmail(user);
        },
      },
    },
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

export function authCapabilities() {
  return {
    google: googleConfigured,
  };
}
