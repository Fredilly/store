import { getCloudflareContext } from "@opennextjs/cloudflare";

type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const defaultFrom = "School Ledger <no-reply@article6.org>";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendEmail(message: EmailMessage) {
  const { env } = getCloudflareContext();
  const runtime = env as unknown as EmailEnv;

  if (!runtime.RESEND_API_KEY) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: runtime.EMAIL_FROM || defaultFrom,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Transactional email failed", response.status, details);
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character
  );
}

function queueEmail(task: Promise<void>) {
  getCloudflareContext().ctx.waitUntil(task);
}

export function queueWelcomeEmail(user: { name: string; email: string }) {
  const name = user.name.trim() || "there";

  queueEmail(
    sendEmail({
      to: user.email,
      subject: "Welcome to School Ledger",
      text: `Hi ${name},\n\nWelcome to School Ledger. Your account is ready.\n\nIf you did not create this account, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome to <strong>School Ledger</strong>. Your account is ready.</p><p>If you did not create this account, you can ignore this email.</p>`,
    })
  );
}

export function queuePasswordResetEmail(user: { name: string; email: string }, url: string) {
  const name = user.name.trim() || "there";
  const safeUrl = escapeHtml(url);

  queueEmail(
    sendEmail({
      to: user.email,
      subject: "Reset your School Ledger password",
      text: `Hi ${name},\n\nUse this link to reset your School Ledger password:\n${url}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Use the link below to reset your School Ledger password.</p><p><a href="${safeUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    })
  );
}
