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

export const auth = betterAuth({
  database: runtime.DB,
  baseURL: runtime.BETTER_AUTH_URL,
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
