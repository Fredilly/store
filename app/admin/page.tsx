import { requirePlatformAdmin } from "../../lib/platform-admin";
import { platformSchoolOverview } from "../../lib/platform-admin-queries";

function formatDate(value: string | null) {
  if (!value) return "No activity yet";

  const date = new Date(value.replace(" ", "T") + "Z");
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function PlatformAdminPage() {
  const admin = await requirePlatformAdmin();
  const overview = await platformSchoolOverview();

  return (
    <main className="shell adminShell">
      <header className="pageTop">
        <p className="eyebrow">Platform owner</p>
        <h1>Schools</h1>
        <p className="muted">
          Read-only view across School Ledger. Signed in as {admin.email}.
        </p>
      </header>

      <section className="summary adminSummary" aria-label="Platform summary">
        <div>
          <span>Total schools</span>
          <strong>{overview.totalSchools}</strong>
        </div>
        <div>
          <span>New this week</span>
          <strong>{overview.newThisWeek}</strong>
        </div>
        <div>
          <span>Active / started</span>
          <strong>
            {overview.schools.filter((school) => school.status !== "Signed up").length}
          </strong>
        </div>
      </section>

      <section className="adminSchoolList" aria-label="Registered schools">
        {overview.schools.length === 0 ? (
          <div className="panel">
            <strong>No schools registered yet.</strong>
          </div>
        ) : (
          overview.schools.map((school) => (
            <article className="panel adminSchoolCard" key={school.orgId}>
              <div className="adminSchoolHeader">
                <div>
                  <span className={"adminStatus adminStatus" + school.status.replaceAll(" ", "")}>
                    {school.status}
                  </span>
                  <h2>{school.schoolName}</h2>
                  <p className="muted">
                    {school.ownerName} · {school.ownerEmail}
                  </p>
                </div>
                <time>{formatDate(school.lastActivityAt ?? school.createdAt)}</time>
              </div>

              <div className="adminMetrics">
                <div><span>Items</span><strong>{school.itemCount}</strong></div>
                <div><span>Stock events</span><strong>{school.stockMovementCount}</strong></div>
                <div><span>Sales</span><strong>{school.saleCount}</strong></div>
                <div><span>Staff</span><strong>{school.staffCount}</strong></div>
              </div>

              <p className="adminCreated">Registered {formatDate(school.createdAt)}</p>
            </article>
          ))
        )}
      </section>

      <p className="status">
        Read only. No editing, impersonation, or school switching is available here.
      </p>
    </main>
  );
}
