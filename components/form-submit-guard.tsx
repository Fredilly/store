"use client";

import { useEffect } from "react";

export function FormSubmitGuard() {
  useEffect(() => {
    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement)) return;
      if (submitter.disabled) return;

      submitter.disabled = true;
      submitter.setAttribute("aria-busy", "true");

      const original = submitter.textContent;
      submitter.dataset.originalLabel = original ?? "";
      submitter.textContent = "Saving…";

      window.setTimeout(() => {
        if (!document.contains(submitter)) return;
        submitter.disabled = false;
        submitter.removeAttribute("aria-busy");
        submitter.textContent = submitter.dataset.originalLabel || original || "Save";
      }, 8000);
    }

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  return null;
}
