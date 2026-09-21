"use client";

import { FormEvent, useState } from "react";
import { BrandMark, WelcomeArtwork } from "../../components/BrandMark";

export function LoginForm({
  initialMessage = "",
  initialEmail = "",
  initialMode = "signin",
}: {
  initialMessage?: string;
  initialEmail?: string;
  initialMode?: "signin" | "signup";
}) {
  const [mode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (mode === "signin") {
      event.preventDefault();
      setMessage("");
      setBusy(true);

      try {
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/login", {
          method: "POST",
          body: form,
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-School-Ledger-Client": "fetch",
          },
        });

        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          setMessage(
            result?.error === "unavailable"
              ? "Could not sign in. Please try again."
              : "Incorrect email or password."
          );
          return;
        }

        window.location.assign("/");
      } catch {
        setMessage("Could not connect. Check your connection and try again.");
      } finally {
        setBusy(false);
      }

      return;
    }

    // Sign-up intentionally falls through to the native form POST.
    // This keeps account creation working on older browsers when hydration fails.
    return;
  }

  return (
    <main className={mode === "signup" ? "authShell authShellWelcome" : "authShell"}>
      {mode === "signup" && (
        <section className="welcomeIntro" aria-label="Welcome to School Ledger">
          <BrandMark />
          <h1>Know what you have.<br />Record what you sell.</h1>
          <p>A simple way to track school stock, sales, and money owed — right from your phone.</p>
          <WelcomeArtwork />
        </section>
      )}

      <section className="authCard">
        {mode === "signin" ? <BrandMark compact /> : <p className="eyebrow">Let’s get started</p>}
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">
          {mode === "signin"
            ? "Sign in to continue."
            : "Start with your first item. We’ll guide you step by step."}
        </p>

        <form action={mode === "signin" ? "/api/login" : "/api/signup"} className="form authForm" method="post" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                autoComplete="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {mode === "signup" && (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                minLength={8}
                name="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
          )}

          {message && (
            <p className="formError" role="alert" aria-live="polite">
              {message}
            </p>
          )}

          <button disabled={busy} type="submit">
            {busy
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {mode === "signin" && (
          <a className="textButton" href="/forgot-password">
            Forgot password?
          </a>
        )}

        <a
          className="textButton"
          href={mode === "signin" ? "/login?mode=signup" : "/login"}
        >
          {mode === "signin"
            ? "First time? Create account"
            : "Already have an account? Sign in"}
        </a>
      </section>
    </main>
  );
}
