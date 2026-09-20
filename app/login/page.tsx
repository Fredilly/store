import { LoginForm } from "./login-form";

const errorMessages: Record<string, string> = {
  credentials: "Incorrect email or password.",
  unavailable: "Could not sign in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const initialMessage = params.error ? errorMessages[params.error] : undefined;

  return <LoginForm initialMessage={initialMessage} />;
}
