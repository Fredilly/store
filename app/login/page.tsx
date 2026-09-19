"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });

    setBusy(false);

    if (result.error) {
      setMessage(result.error.message || "Could not continue.");
      return;
    }

    window.location.href = "/";
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

        <form className="form authForm" onSubmit={submit}>
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

          {message && <p className="formError">{message}</p>}

          <button disabled={busy} type="submit">
            {busy
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          className="textButton"
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage("");
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
