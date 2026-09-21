import { cookies } from "next/headers";
import { LoginForm } from "./login-form";
import { authCapabilities } from "../../lib/auth";

const errorMessages: Record<string, string> = {
  credentials: "Incorrect email or password.",
  unavailable: "Could not sign in. Please try again.",
  signup: "Could not create account. Please check your details and try again.",
  passwords: "Passwords do not match.",
  existing: "This email already has an account. Sign in instead.",
  google: "Could not sign in with Google. Try email and password instead.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; mode?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const capabilities = authCapabilities();
  const initialMessage = params.error ? errorMessages[params.error] : undefined;
  const initialEmail = decodeURIComponent(
    cookieStore.get("login_email")?.value ?? ""
  );
  const initialName = decodeURIComponent(
    cookieStore.get("signup_name")?.value ?? ""
  );

  return (
    <LoginForm
      initialEmail={initialEmail}
      initialName={initialName}
      initialMessage={initialMessage}
      initialMode={params.mode === "signup" ? "signup" : "signin"}
      googleEnabled={capabilities.google}
    />
  );
}
