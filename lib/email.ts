import { getCloudflareContext } from "@opennextjs/cloudflare";

type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const defaultFrom = "School Ledger <no-reply@article6.org>";
const appUrl = "https://store.article6.org/";

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

function emailLayout({
  preview,
  title,
  body,
  actionLabel,
  actionUrl,
  footerNote,
}: {
  preview: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}) {
  const action =
    actionLabel && actionUrl
      ? `
        <tr>
          <td style="padding:8px 0 28px;">
            <a href="${escapeHtml(actionUrl)}"
              style="display:inline-block;background:#111318;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;line-height:20px;padding:14px 22px;border-radius:12px;">
              ${actionLabel}
            </a>
          </td>
        </tr>`
      : "";

  const note = footerNote
    ? `
      <tr>
        <td style="padding:18px 0 0;border-top:1px solid #e7e9ed;color:#6b7280;font-size:13px;line-height:20px;">
          ${footerNote}
        </td>
      </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111318;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e7e9ed;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:#111318;color:#ffffff;">
              <div style="font-size:22px;font-weight:800;line-height:28px;">School Ledger</div>
              <div style="margin-top:4px;font-size:13px;line-height:18px;color:#c7cbd1;">Simple stock and sales records for your school.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 0 18px;font-size:26px;font-weight:800;line-height:34px;color:#111318;">${title}</td>
                </tr>
                <tr>
                  <td style="padding:0;color:#34383f;font-size:16px;line-height:25px;">${body}</td>
                </tr>
                ${action}
                ${note}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#fafafa;color:#8a9099;font-size:12px;line-height:18px;">
              School Ledger · Keep stock, sales, and money records clear.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function queueWelcomeEmail(user: { name: string; email: string }) {
  if (user.email.toLowerCase().endsWith(".invalid")) return;

  const name = user.name.trim() || "there";
  const safeName = escapeHtml(name);

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
      html: emailLayout({
        preview: "Your School Ledger account is ready.",
        title: "Welcome to School Ledger",
        body: `
          <p style="margin:0 0 16px;">Hi ${safeName},</p>
          <p style="margin:0 0 16px;">Your account is ready.</p>
          <p style="margin:0 0 24px;">You can now keep track of what you have, record what you sell, and see what money has been received or is still owed.</p>
        `,
        actionLabel: "Add your first item",
        actionUrl: appUrl,
        footerNote: "We’ll guide you step by step. If you did not create this account, you can ignore this email.",
      }),
    })
  );
}

export function queuePasswordResetEmail(user: { name: string; email: string }, url: string) {
  const name = user.name.trim() || "there";
  const safeName = escapeHtml(name);

  queueEmail(
    sendEmail({
      to: user.email,
      subject: "Reset your School Ledger password",
      text: `Hi ${name},

Tap the link below to choose a new School Ledger password:
${url}

If you did not request a password reset, you can safely ignore this email.`,
      html: emailLayout({
        preview: "Use this link to reset your School Ledger password.",
        title: "Reset your password",
        body: `
          <p style="margin:0 0 16px;">Hi ${safeName},</p>
          <p style="margin:0 0 24px;">We received a request to reset your School Ledger password. Tap the button below to choose a new one.</p>
        `,
        actionLabel: "Reset password",
        actionUrl: url,
        footerNote: "If you did not request a password reset, you can safely ignore this email.",
      }),
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
  const safeEmail = escapeHtml(email);
  const loginUrl = `${appUrl}login`;

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
    html: emailLayout({
      preview: `You've been invited to join ${safeOrganization} on School Ledger.`,
      title: `Join ${safeOrganization}`,
      body: `
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">You've been invited to join <strong>${safeOrganization}</strong> on School Ledger.</p>
        <p style="margin:0 0 8px;">Use this exact email address to create your account or sign in:</p>
        <p style="margin:0 0 24px;font-weight:700;color:#111318;">${safeEmail}</p>
        <p style="margin:0 0 24px;">As staff, you can record sales, add stock, and see what is in stock.</p>
      `,
      actionLabel: `Join ${safeOrganization}`,
      actionUrl: loginUrl,
      footerNote: "If you were not expecting this invitation, you can ignore this email.",
    }),
  });
}
