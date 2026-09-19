import Link from "next/link";
import { listVariants } from "../../lib/queries";
import { formatNaira } from "../../lib/money";

export default async function SellPage() {
  const variants = (await listVariants()).filter((item) => item.stock > 0);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Sell Item</p>
        <h1>Record a sale</h1>
        <p className="muted">Three fields. Leave amount paid blank when fully paid.</p>
      </div>

      <section className="panel">
        {variants.length === 0 ? (
          <>
            <h2>No stock yet</h2>
            <p className="muted">Add stock before recording a sale.</p>
            <Link className="inlineAction" href="/stock">Add stock →</Link>
          </>
        ) : (
          <form action="/api/sales" method="post" className="form">
            <label>
              Item
              <select name="variant_id" required>
                {variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {formatNaira(item.selling_price_minor)} · {item.stock} left
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input name="quantity" inputMode="numeric" min="1" type="number" defaultValue="1" required />
            </label>

            <label>
              Student / parent, optional
              <input name="customer_name" autoComplete="off" placeholder="Name" />
            </label>

            <label>
              Amount paid
              <input name="amount_paid" inputMode="decimal" min="0" step="0.01" type="number" placeholder="Leave blank if fully paid" />
            </label>

            <button type="submit">Record sale</button>
          </form>
        )}
      </section>
    </main>
  );
}
