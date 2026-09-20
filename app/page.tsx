import { SignOutButton } from "../components/sign-out-button";
import { formatNaira } from "../lib/money";
import { moneySummary } from "../lib/queries";
import { requirePageTenant } from "../lib/tenant";

const baseActions = [
  { label: "Sell Item", href: "/sell", detail: "Record a sale" },
  { label: "Add Stock", href: "/stock", detail: "Record items received" },
  { label: "Inventory", href: "/inventory", detail: "See what is left" },
];

const successMessages: Record<string, string> = {
  sale: "Sale recorded.",
  stock: "Stock added.",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const tenant = await requirePageTenant();
  const summary = tenant.role === "OWNER" ? await moneySummary(tenant.orgId) : null;
  const params = (await searchParams) ?? {};
  const success = params.success ? successMessages[params.success] : undefined;
  const actions =
    tenant.role === "OWNER"
      ? [
          ...baseActions,
          { label: "Money", href: "/money", detail: "Sold, received, still owed" },
          { label: "Activity", href: "/activity", detail: "See who changed what" },
        ]
      : baseActions;

  return (
    <main className="shell">
      {success && (
        <div className="successBanner" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{success}</strong>
        </div>
      )}

      <header className="header">
        <div className="headerRow">
          <div>
            <p className="eyebrow">{tenant.orgName}</p>
            <h1>Hello, {tenant.userName}</h1>
          </div>
          <SignOutButton />
        </div>
        <p className="muted">What do you want to do?</p>
      </header>

      {summary && (
        <section className="summary" aria-label="Money summary">
          <div>
            <span>Total sold</span>
            <strong>{formatNaira(summary.sales)}</strong>
          </div>
          <div>
            <span>Money received</span>
            <strong>{formatNaira(summary.received)}</strong>
          </div>
          <div>
            <span>Still owed</span>
            <strong>{formatNaira(summary.outstanding)}</strong>
          </div>
        </section>
      )}

      <section className="actions" aria-label="Main actions">
        {actions.map((action) => (
          <a className="action" href={action.href} key={action.href}>
            <strong>{action.label}</strong>
            <span>{action.detail}</span>
          </a>
        ))}
      </section>

      {tenant.role === "OWNER" && (
        <div className="ownerLinks">
          <a className="inlineAction" href="/staff">Manage staff →</a>
          <a className="inlineAction" href="/export">Export records →</a>
        </div>
      )}
    </main>
  );
}
