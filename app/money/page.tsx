import Link from "next/link";
import { listOutstandingSales, moneySummary } from "../../lib/queries";
import { formatNaira } from "../../lib/money";

export default async function MoneyPage() {
  const [summary, outstanding] = await Promise.all([
    moneySummary(),
    listOutstandingSales(),
  ]);

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

      <section className="panel secondaryPanel">
        <h2>Outstanding payments</h2>
        {outstanding.length === 0 ? (
          <p className="muted">Nothing outstanding.</p>
        ) : (
          <div className="balanceList">
            {outstanding.map((sale) => (
              <form action="/api/payments" method="post" className="balanceRow" key={sale.id}>
                <input type="hidden" name="sale_id" value={sale.id} />
                <div>
                  <strong>{sale.label}</strong>
                  <span>Balance {formatNaira(sale.balance_minor)}</span>
                </div>
                <div className="balancePay">
                  <input
                    aria-label="Payment amount"
                    name="amount"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    type="number"
                    placeholder="Amount"
                    required
                  />
                  <button type="submit">Pay</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="panel secondaryPanel">
        <h2>Record expense</h2>
        <form action="/api/expenses" method="post" className="form">
          <label>
            Description
            <input name="description" placeholder="Transport" required />
          </label>
          <label>
            Amount
            <input name="amount" inputMode="decimal" min="0.01" step="0.01" type="number" placeholder="0" required />
          </label>
          <label>
            Category, optional
            <input name="category" placeholder="Supplies" />
          </label>
          <button type="submit" className="buttonSecondary">Save expense</button>
        </form>
      </section>
    </main>
  );
}
