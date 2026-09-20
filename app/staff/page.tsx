import Link from "next/link";
import { db } from "../../lib/db";
import { requirePageOwner } from "../../lib/tenant";

type StaffRow = {
  user_id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
};

type InviteRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

const errorMessages: Record<string, string> = {
  invite: "Could not create the invite. Please try again.",
  member: "This person is already a staff member.",
  pending: "This person has already been invited. You can resend the invite below.",
  resend: "Could not resend the invitation email. Please try again.",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    invited?: string;
    resent?: string;
    mail?: string;
  }>;
}) {
  const tenant = await requirePageOwner();
  const params = (await searchParams) ?? {};
  const database = db();

  const [staffResult, inviteResult] = await Promise.all([
    database
      .prepare(
        `SELECT
          m.user_id,
          u.name,
          u.email,
          m.status
        FROM organization_members m
        JOIN "user" u ON u.id = m.user_id
        WHERE m.organization_id = ?
          AND m.role = 'STAFF'
        ORDER BY u.name, u.email`
      )
      .bind(tenant.orgId)
      .all<StaffRow>(),
    database
      .prepare(
        `SELECT id, name, email, created_at
        FROM staff_invites
        WHERE organization_id = ?
          AND status = 'PENDING'
        ORDER BY created_at DESC`
      )
      .bind(tenant.orgId)
      .all<InviteRow>(),
  ]);

  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const successMessage =
    params.resent === "1"
      ? "Invitation email resent."
      : params.invited === "1" && params.mail !== "failed"
        ? "Staff invite sent."
        : undefined;
  const warningMessage =
    params.invited === "1" && params.mail === "failed"
      ? "Invite created, but the email could not be sent. Use Resend invite below."
      : undefined;

  return (
    <main className="shell">
      {successMessage && (
        <div className="toastBanner successBanner" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{successMessage}</strong>
        </div>
      )}

      {errorMessage && (
        <div className="messageBanner errorBanner" role="alert">
          <strong>{errorMessage}</strong>
        </div>
      )}

      {warningMessage && (
        <div className="messageBanner warningBanner" role="alert">
          <strong>{warningMessage}</strong>
        </div>
      )}

      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Staff</p>
        <h1>Manage staff</h1>
        <p className="muted">Staff can sell items, add stock, and view inventory.</p>
      </div>

      <section className="panel">
        <h2>Add staff</h2>
        <form action="/api/staff/invite" method="post" className="form">
          <label>
            Name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" inputMode="email" autoComplete="email" required />
          </label>
          <button type="submit">Send invite</button>
        </form>
        <p className="muted">
          We’ll email them an invitation. They should use this exact email to create or sign in to their account.
        </p>
      </section>

      {inviteResult.results.length > 0 && (
        <section className="panel secondaryPanel">
          <h2>Pending invites</h2>
          <div className="balanceList">
            {inviteResult.results.map((invite) => (
              <div className="balanceRow pendingInviteRow" key={invite.id}>
                <div>
                  <strong>{invite.name}</strong>
                  <span>{invite.email}</span>
                  <span>Pending</span>
                </div>
                <form action="/api/staff/invite/resend" method="post">
                  <input type="hidden" name="invite_id" value={invite.id} />
                  <button type="submit" className="buttonSecondary">
                    Resend invite
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel secondaryPanel">
        <h2>Staff accounts</h2>
        {staffResult.results.length === 0 ? (
          <p className="muted">No staff accounts yet.</p>
        ) : (
          <div className="balanceList">
            {staffResult.results.map((staff) => (
              <form action="/api/staff/status" method="post" className="balanceRow" key={staff.user_id}>
                <input type="hidden" name="user_id" value={staff.user_id} />
                <input
                  type="hidden"
                  name="status"
                  value={staff.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                />
                <div>
                  <strong>{staff.name}</strong>
                  <span>{staff.email} · {staff.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                </div>
                <button type="submit" className="buttonSecondary">
                  {staff.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
