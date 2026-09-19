import Link from "next/link";
import { listVariants } from "../../lib/queries";

export default async function StockPage() {
  const variants = await listVariants();

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Add Stock</p>
        <h1>Stock received</h1>
        <p className="muted">Choose an item, enter the quantity, save.</p>
      </div>

      <section className="panel">
        <h2>Add stock</h2>
        {variants.length === 0 ? (
          <p className="muted">Create your first item below.</p>
        ) : (
          <form action="/api/stock" method="post" className="form">
            <label>
              Item
              <select name="variant_id" required>
                {variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.stock} left
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity received
              <input name="quantity" inputMode="numeric" min="1" type="number" defaultValue="1" required />
            </label>

            <label>
              Unit cost, optional
              <input name="unit_cost" inputMode="decimal" min="0" step="0.01" type="number" placeholder="0" />
            </label>

            <button type="submit">Save stock</button>
          </form>
        )}
      </section>

      <section className="panel secondaryPanel">
        <h2>New item</h2>
        <form action="/api/products" method="post" className="form">
          <label>
            Item name
            <input name="name" placeholder="School Uniform" required />
          </label>
          <label>
            Size / class, optional
            <input name="variant_name" placeholder="Size 10" />
          </label>
          <label>
            Category, optional
            <input name="category" placeholder="Uniform" />
          </label>
          <label>
            Selling price
            <input name="selling_price" inputMode="decimal" min="0.01" step="0.01" type="number" placeholder="8000" required />
          </label>
          <button type="submit" className="buttonSecondary">Create item</button>
        </form>
      </section>
    </main>
  );
}
