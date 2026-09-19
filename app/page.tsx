import { SignOutButton } from "../components/sign-out-button";
import { formatNaira } from "../lib/money";
import { moneySummary } from "../lib/queries";
import { requirePageTenant } from "../lib/tenant";

const actions = [
  { label: "Sell Item", href: "/sell", detail: "Record a sale" },
  { label: "Add Stock", href: "/stock", detail: "Record items received" },
  { label: "Inventory", href: "/inventory", detail: "See what is left" },
  { label: "Money", href: "/money", detail: "Sales, received, outstanding" },
];

export default async function Home() {
  const tenant = await requirePageTenant();
  const summary = await moneySummary(tenant.orgId);

  return (
    <main className="shell">
      <header className="header">
        <div className="headerRow">
          <div>
            <p className="eyebrow">{tenant.orgName}</p>
            <h1>Hello, {tenant.userName}</h1>
          </div>
          <SignOutButton />
        </div>
        <p className="muted">What do you want to record?</p>
      </header>

      <section className="summary" aria-label="Money summary">
        <div>
          <span>Sales</span>
          <strong>{formatNaira(summary.sales)}</strong>
        </div>
        <div>
          <span>Received</span>
          <strong>{formatNaira(summary.received)}</strong>
        </div>
        <div>
          <span>Outstanding</span>
          <strong>{formatNaira(summary.outstanding)}</strong>
        </div>
      </section>

      <section className="actions" aria-label="Main actions">
        {actions.map((action) => (
          <a className="action" href={action.href} key={action.href}>
            <strong>{action.label}</strong>
            <span>{action.detail}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
