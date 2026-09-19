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

export default async function StaffPage() {
  const tenant = await requirePageOwner();
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

  return (
    <main className="shell">
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
          <button type="submit">Create invite</button>
        </form>
        <p className="muted">
          They should create or sign in to an account using this exact email.
        </p>
      </section>

      {inviteResult.results.length > 0 && (
        <section className="panel secondaryPanel">
          <h2>Pending invites</h2>
          <div className="balanceList">
            {inviteResult.results.map((invite) => (
              <div className="balanceRow" key={invite.id}>
                <div>
                  <strong>{invite.name}</strong>
                  <span>{invite.email}</span>
                </div>
                <span>Pending</span>
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
