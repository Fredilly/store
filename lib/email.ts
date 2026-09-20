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

  if (!runtime.RESEND_API_KEY) return false;

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
    return false;
  }

  return true;
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

function queueEmail(task: Promise<unknown>) {
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


export async function sendStaffInviteEmail({
  name,
  email,
  organizationName,
}: {
  name: string;
  email: string;
  organizationName: string;
}) {
  const recipientName = name.trim() || "there";
  const safeName = escapeHtml(recipientName);
  const safeOrganization = escapeHtml(organizationName);
  const loginUrl = "https://store.article6.org/login";

  return sendEmail({
    to: email,
    subject: `You've been invited to ${organizationName} on School Ledger`,
    text: `Hi ${recipientName},

You've been invited to join ${organizationName} as staff on School Ledger.

Use this exact email address to create your account or sign in:
${loginUrl}

As staff, you can sell items, add stock, and view inventory.`,
    html: `<p>Hi ${safeName},</p><p>You've been invited to join <strong>${safeOrganization}</strong> as staff on <strong>School Ledger</strong>.</p><p>Use this exact email address to create your account or sign in.</p><p><a href="${loginUrl}">Open School Ledger</a></p><p>As staff, you can sell items, add stock, and view inventory.</p>`,
  });
}
