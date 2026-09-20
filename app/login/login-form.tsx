"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { BrandMark, WelcomeArtwork } from "../../components/BrandMark";

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

export function LoginForm({
  initialMessage = "",
  initialEmail = "",
}: {
  initialMessage?: string;
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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

    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
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
