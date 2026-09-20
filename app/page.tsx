import { SignOutButton } from "../components/sign-out-button";
import { Icon, type IconName } from "../components/Icon";
import { formatNaira } from "../lib/money";
import { moneySummary, onboardingProgress } from "../lib/queries";
import { requirePageTenant } from "../lib/tenant";

const baseActions: Array<{ label: string; href: string; detail: string; icon: IconName }> = [
  { label: "Sell Item", href: "/sell", detail: "Record a sale", icon: "sell" },
  { label: "Add Stock", href: "/stock", detail: "Record items received", icon: "stockIn" },
  { label: "Stock", href: "/inventory", detail: "See what you have", icon: "stock" },
];

const successMessages: Record<string, string> = {
  item: "Your item is ready.",
  sale: "Sale recorded.",
  stock: "Stock added.",
};

function FirstRun({
  productCount,
  stockUnits,
}: {
  productCount: number;
  stockUnits: number;
}) {
  if (productCount === 0) {
    return (
      <section className="firstRun" aria-label="Getting started">
        <p className="firstRunStep">Step 1 of 2</p>
        <h2>Let’s add your first item</h2>
        <p>Add something you sell, like a uniform or textbook. You only need a name and selling price.</p>
        <a className="firstRunAction" href="/stock#new-item">Add your first item</a>
      </section>
    );
  }

  if (stockUnits <= 0) {
    return (
      <section className="firstRun" aria-label="Getting started">
        <div className="firstRunDone">✓ First item added</div>
        <p className="firstRunStep">Step 2 of 2</p>
        <h2>Now add some stock</h2>
        <p>Tell the app how many you have. That’s all you need before you can sell.</p>
        <a className="firstRunAction" href="/stock">Add stock</a>
      </section>
    );
  }

  return (
    <section className="firstRun" aria-label="Getting started">
      <div className="firstRunDone">✓ Item and stock ready</div>
      <p className="firstRunStep">Step 3 of 3</p>
      <h2>You’re ready for your first sale</h2>
      <p>Choose the item, confirm the quantity, and record the sale.</p>
      <a className="firstRunAction" href="/sell">Record your first sale</a>
    </section>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const tenant = await requirePageTenant();
  const params = (await searchParams) ?? {};
  const progress = tenant.role === "OWNER" ? await onboardingProgress(tenant.orgId) : null;
  const isFirstRun = Boolean(progress && (progress.productCount === 0 || progress.stockUnits <= 0));
  const showOptionalFirstSale = Boolean(
    progress &&
      progress.productCount > 0 &&
      progress.stockUnits > 0 &&
      progress.saleCount === 0
  );
  const summary = tenant.role === "OWNER" && !isFirstRun ? await moneySummary(tenant.orgId) : null;
  const success =
    params.success === "item" && progress?.productCount === 1
      ? "Nice — your first item is ready ✨"
      : params.success === "stock" && progress?.saleCount === 0
        ? "Great — stock added. You’re ready to go 🎉"
        : params.success === "sale" && progress?.saleCount === 1
          ? "First sale recorded 🎉"
          : params.success
            ? successMessages[params.success]
            : undefined;
  const actions =
    tenant.role === "OWNER"
      ? [
          ...baseActions,
          { label: "Money", href: "/money", detail: "Sold, received, still owed", icon: "money" as const },
          { label: "Activity", href: "/activity", detail: "See who changed what", icon: "activity" as const },
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
        <p className="muted">
          {isFirstRun ? "We’ll get the basics ready in two simple steps." : "What do you want to do?"}
        </p>
      </header>

      {isFirstRun && progress ? (
        <FirstRun productCount={progress.productCount} stockUnits={progress.stockUnits} />
      ) : (
        <>
          {showOptionalFirstSale && (
            <section className="firstSaleHint" aria-label="Optional first sale helper">
              <div>
                <strong>Ready when you are</strong>
                <span>Your first sale can wait. When something sells, record it here.</span>
              </div>
              <a href="/sell">Record a sale →</a>
            </section>
          )}

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
                <div className="actionTitle">
                  <Icon name={action.icon} size={30} className="actionIcon" />
                  <strong>{action.label}</strong>
                </div>
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
        </>
      )}
    </main>
  );
}
