"use client";

import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);

    await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setBusy(false);
    setMessage(
      "If an account exists for that email, a password reset link has been sent."
    );
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <p className="eyebrow">School Ledger</p>
        <h1>Reset your password</h1>
        <p className="muted">Enter the email used for your account.</p>

        <form className="form authForm" onSubmit={submit}>
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
          {message && <p role="status">{message}</p>}
          <button disabled={busy} type="submit">
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <a className="textButton" href="/login">Back to sign in</a>
      </section>
    </main>
  );
}
