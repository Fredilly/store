const actions = [
  { label: "Sell Item", href: "/sell", detail: "Record a sale" },
  { label: "Add Stock", href: "/stock", detail: "Record items received" },
  { label: "Inventory", href: "/inventory", detail: "See what is left" },
  { label: "Money", href: "/money", detail: "Sales, received, outstanding" },
];

export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <p className="eyebrow">School Ledger</p>
        <h1>Good afternoon</h1>
        <p className="muted">What do you want to record?</p>
      </header>

      <section className="summary" aria-label="Today">
        <div>
          <span>Sales today</span>
          <strong>₦0</strong>
        </div>
        <div>
          <span>Received</span>
          <strong>₦0</strong>
        </div>
        <div>
          <span>Outstanding</span>
          <strong>₦0</strong>
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

      <p className="status">MVP foundation ready. Database wiring comes next.</p>
    </main>
  );
}
