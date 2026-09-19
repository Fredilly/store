"use client";

import { authClient } from "../lib/auth-client";

export function SignOutButton() {
  return (
    <button
      className="textButton"
      type="button"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
