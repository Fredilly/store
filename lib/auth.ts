import { betterAuth } from "better-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { queuePasswordResetEmail, queueWelcomeEmail } from "./email";

type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

function runtimeEnv(): AuthEnv {
  return getCloudflareContext().env as unknown as AuthEnv;
}

function createAuth() {
  const runtime = runtimeEnv();
  const isProduction = runtime.BETTER_AUTH_URL === "https://store.article6.org";

  if (isProduction && !runtime.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  const googleConfigured = Boolean(
    runtime.GOOGLE_CLIENT_ID && runtime.GOOGLE_CLIENT_SECRET
  );

  const trustedOrigins = Array.from(
    new Set(
      (
        isProduction
          ? [runtime.BETTER_AUTH_URL, "https://store.article6.org"]
          : [
              runtime.BETTER_AUTH_URL,
              "https://store.article6.org",
              "https://store.fredilly.workers.dev",
              "http://localhost:3000",
            ]
      ).filter((value): value is string => Boolean(value))
    )
  );

  return betterAuth({
    database: runtime.DB,
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
      },
    },
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
}

type AuthInstance = ReturnType<typeof createAuth>;
let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  authInstance ??= createAuth();
  return authInstance;
}

export function isAuthConfigured() {
  return Boolean(runtimeEnv().BETTER_AUTH_SECRET);
}

export function authCapabilities() {
  const runtime = runtimeEnv();
  return {
    google: Boolean(runtime.GOOGLE_CLIENT_ID && runtime.GOOGLE_CLIENT_SECRET),
  };
}
