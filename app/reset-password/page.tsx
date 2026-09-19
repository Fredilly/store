"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidToken = searchParams.get("error") === "INVALID_TOKEN";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!token || invalidToken) {
      setMessage("This reset link is invalid or has expired.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setBusy(false);

    if (result.error) {
      setMessage("This reset link is invalid or has expired.");
      return;
    }

    setDone(true);
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <p className="eyebrow">School Ledger</p>
        <h1>Choose a new password</h1>

        {done ? (
          <>
            <p>Your password has been changed. Sign in with the new password.</p>
            <a className="textButton" href="/login">Go to sign in</a>
          </>
        ) : (
          <form className="form authForm" onSubmit={submit}>
            <label>
              New password
              <input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                autoComplete="new-password"
                minLength={8}
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>
            {(message || invalidToken || !token) && (
              <p className="formError">
                {message || "This reset link is invalid or has expired."}
              </p>
            )}
            <button disabled={busy || invalidToken || !token} type="submit">
              {busy ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
