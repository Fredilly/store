import Link from "next/link";
import { Icon } from "../../components/Icon";
import { formatNaira } from "../../lib/money";
import { listCorrectableSales, listVariants } from "../../lib/queries";
import { requirePageOwner } from "../../lib/tenant";

const messages: Record<string, string> = {
  void: "Sale voided and stock restored.",
  payment: "Money correction recorded.",
  stock: "Stock correction recorded.",
};

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const tenant = await requirePageOwner();
  const params = (await searchParams) ?? {};
  const [sales, variants] = await Promise.all([
    listCorrectableSales(tenant.orgId),
    listVariants(tenant.orgId),
  ]);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/"><Icon name="home" size={19} className="backIcon" /><span>Home</span></Link>
        <p className="eyebrow">Corrections</p>
        <h1>Fix a mistake</h1>
        <p className="muted">Nothing is erased. Every correction stays in the activity history.</p>
      </div>

      {params.success && messages[params.success] && (
        <div className="successBanner" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{messages[params.success]}</strong>
        </div>
      )}

      {params.error && (
        <div className="panel" role="alert">
          <strong>Could not record that correction.</strong>
          <p className="muted">Check the amount, stock available, and reason, then try again.</p>
        </div>
      )}

      <section className="panel secondaryPanel">
        <h2>Void a sale</h2>
        <p className="muted">Use this when the whole sale was entered by mistake. Stock and money totals are reversed without deleting history.</p>
        {sales.length === 0 ? (
          <p className="muted">No completed sales to void.</p>
        ) : (
          <div className="balanceList">
            {sales.map((sale) => (
              <form action="/api/sales/void" method="post" className="balanceRow" key={sale.id}>
                <input type="hidden" name="sale_id" value={sale.id} />
                <div>
                  <strong>{sale.label}</strong>
                  <span>Sold {formatNaira(sale.total_minor)} · Received {formatNaira(sale.paid_minor)}</span>
                  <span>{sale.created_at}</span>
                </div>
                <div className="balancePay">
                  <input name="reason" placeholder="Reason" required />
                  <button type="submit" className="buttonSecondary">Void sale</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="panel secondaryPanel">
        <h2>Correct money received</h2>
        <p className="muted">Use this when the app says more money was received than actually came in.</p>
        {sales.filter((sale) => sale.paid_minor > 0).length === 0 ? (
          <p className="muted">No received payments to correct.</p>
        ) : (
          <div className="balanceList">
            {sales.filter((sale) => sale.paid_minor > 0).map((sale) => (
              <form action="/api/payments/correct" method="post" className="balanceRow" key={sale.id}>
                <input type="hidden" name="sale_id" value={sale.id} />
                <div>
                  <strong>{sale.label}</strong>
                  <span>Currently received {formatNaira(sale.paid_minor)}</span>
                </div>
                <div className="balancePay">
                  <input aria-label="Amount to remove" name="amount" inputMode="decimal" min="0.01" step="0.01" type="number" placeholder="Amount to remove" required />
                  <input name="reason" placeholder="Reason" required />
                  <button type="submit" className="buttonSecondary">Record correction</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="panel secondaryPanel">
        <h2>Correct stock</h2>
        <p className="muted">Record returns, damage, or a counted-stock correction. The original history stays unchanged.</p>
        <form action="/api/stock/adjust" method="post" className="form">
          <label>
            Item
            <select name="variant_id" required>
              {variants.map((item) => (
                <option key={item.id} value={item.id}>{item.label} · {item.stock} in stock</option>
              ))}
            </select>
          </label>
          <label>
            What happened?
            <select name="action" required>
              <option value="RETURN">Item returned to stock</option>
              <option value="DAMAGE">Item damaged / lost</option>
              <option value="ADJUSTMENT_ADD">Counted more than the app shows</option>
              <option value="ADJUSTMENT_REMOVE">Counted fewer than the app shows</option>
            </select>
          </label>
          <label>
            Quantity
            <input name="quantity" inputMode="numeric" min="1" type="number" defaultValue="1" required />
          </label>
          <label>
            Reason
            <input name="reason" placeholder="Why are you correcting this?" required />
          </label>
          <button type="submit" className="buttonSecondary">Record stock correction</button>
        </form>
      </section>
    </main>
  );
}
