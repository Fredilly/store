"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

async function hasAuthenticatedSession() {
  const response = await fetch("/api/auth/get-session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) return false;

  const data = (await response.json()) as {
    session?: unknown;
    user?: unknown;
  } | null;

  return Boolean(data?.session && data?.user);
}

export function LoginForm({ initialMessage = "" }: { initialMessage?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    if (mode === "signin") {
      return;
    }

    event.preventDefault();
    setMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setMessage(result.error.message || "Could not create account.");
        return;
      }

      const authenticated = await hasAuthenticatedSession();

      if (!authenticated) {
        setMessage("Account created, but sign in did not complete. Please sign in.");
        return;
      }

      window.location.assign("/");
    } catch {
      setMessage("Could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <p className="eyebrow">School Ledger</p>
        <h1>{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="muted">
          {mode === "signin"
            ? "Sign in to your school."
            : "Use the email your school owner invited, or create a new school."}
        </p>

        <form action="/api/login" className="form authForm" method="post" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                autoComplete="name"
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

        <button
          className="textButton"
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage("");
            setPassword("");
            setConfirmPassword("");
          }}
        >
          {mode === "signin"
            ? "First time? Create account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
