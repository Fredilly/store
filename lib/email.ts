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
  if (user.email.toLowerCase().endsWith(".invalid")) return;

  const name = user.name.trim() || "there";
  const appUrl = "https://store.article6.org/";

  queueEmail(
    sendEmail({
      to: user.email,
      subject: "Welcome to School Ledger — your account is ready",
      text: `Hi ${name},

Welcome to School Ledger.

You can now keep track of what you have, record what you sell, and see what money has been received or is still owed.

Start by adding your first item:
${appUrl}

We’ll guide you step by step.

If you did not create this account, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome to <strong>School Ledger</strong>.</p><p>You can now keep track of what you have, record what you sell, and see what money has been received or is still owed.</p><p><a href="${appUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#15171a;color:#ffffff;text-decoration:none;font-weight:700;">Add your first item</a></p><p>We’ll guide you step by step.</p><p style="color:#686d75;">If you did not create this account, you can ignore this email.</p>`,
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
      text: `Hi ${name},

Tap the link below to choose a new School Ledger password:
${url}

If you did not request a password reset, you can safely ignore this email.`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Tap the button below to choose a new School Ledger password.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#15171a;color:#ffffff;text-decoration:none;font-weight:700;">Reset password</a></p><p style="color:#686d75;">If you did not request a password reset, you can safely ignore this email.</p>`,
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
    subject: `You're invited to join ${organizationName}`,
    text: `Hi ${recipientName},

You've been invited to join ${organizationName} on School Ledger.

Use this exact email address to create your account or sign in:
${email}

Open School Ledger:
${loginUrl}

As staff, you can record sales, add stock, and see what is in stock.

If you were not expecting this invitation, you can ignore this email.`,
    html: `<p>Hi ${safeName},</p><p>You've been invited to join <strong>${safeOrganization}</strong> on <strong>School Ledger</strong>.</p><p>Use this exact email address to create your account or sign in:<br><strong>${escapeHtml(email)}</strong></p><p><a href="${loginUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#15171a;color:#ffffff;text-decoration:none;font-weight:700;">Join ${safeOrganization}</a></p><p>As staff, you can record sales, add stock, and see what is in stock.</p><p style="color:#686d75;">If you were not expecting this invitation, you can ignore this email.</p>`,
  });
}
