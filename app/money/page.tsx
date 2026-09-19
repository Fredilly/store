import Link from "next/link";
import { moneySummary } from "../../lib/queries";
import { formatNaira } from "../../lib/money";

export default async function MoneyPage() {
  const summary = await moneySummary();

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Money</p>
        <h1>Money summary</h1>
      </div>

      <section className="moneyGrid">
        <div className="moneyCard">
          <span>Sales</span>
          <strong>{formatNaira(summary.sales)}</strong>
        </div>
        <div className="moneyCard">
          <span>Money received</span>
          <strong>{formatNaira(summary.received)}</strong>
        </div>
        <div className="moneyCard">
          <span>Outstanding</span>
          <strong>{formatNaira(summary.outstanding)}</strong>
        </div>
        <div className="moneyCard">
          <span>Expenses</span>
          <strong>{formatNaira(summary.expenses)}</strong>
        </div>
      </section>

      <p className="status">Current MVP totals are all-time. Daily views come next.</p>
    </main>
  );
}
