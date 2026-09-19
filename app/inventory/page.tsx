import Link from "next/link";
import { listVariants } from "../../lib/queries";
import { formatNaira } from "../../lib/money";
import { requirePageTenant } from "../../lib/tenant";

export default async function InventoryPage() {
  const tenant = await requirePageTenant();
  const variants = await listVariants(tenant.orgId);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Inventory</p>
        <h1>What is left</h1>
      </div>

      <section className="list">
        {variants.length === 0 ? (
          <div className="panel">
            <p className="muted">No items yet.</p>
            <Link className="inlineAction" href="/stock">Create an item →</Link>
          </div>
        ) : (
          variants.map((item) => (
            <article className="inventoryRow" key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <span>Selling price · {formatNaira(item.selling_price_minor)}</span>
              </div>
              <div className="stockCount"><b className={item.stock <= 2 ? "lowStock" : ""}>{item.stock}</b><span>in stock</span></div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
