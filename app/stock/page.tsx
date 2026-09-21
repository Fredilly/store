import Link from "next/link";
import { Icon } from "../../components/Icon";
import { listVariants } from "../../lib/queries";
import { requirePageTenant } from "../../lib/tenant";
import { BarcodeScanner } from "../../components/BarcodeScanner";
import { ItemPicker } from "../../components/item-picker";

export default async function StockPage() {
  const tenant = await requirePageTenant();
  const variants = await listVariants(tenant.orgId);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/"><Icon name="home" size={19} className="backIcon" /><span>Home</span></Link>
        <p className="eyebrow">Add Stock</p>
        <h1>Stock received</h1>
        <p className="muted">Choose an item, enter the quantity, save.</p>
      </div>

      <section className="panel">
        <h2>Add stock</h2>
        <BarcodeScanner
          targetSelectId={variants.length > 0 ? "stock-variant" : undefined}
          unknownBarcodeInputId={tenant.role === "OWNER" ? "new-item-barcode" : undefined}
        />
        {variants.length === 0 ? (
          <p className="muted">
            {tenant.role === "OWNER"
              ? "Create your first item below."
              : "Ask the owner to create an item first."}
          </p>
        ) : (
          <form action="/api/stock" method="post" className="form">
            <label>
              Item
              <ItemPicker items={variants} selectId="stock-variant" />
            </label>
            <label>
              Quantity received
              <input name="quantity" inputMode="numeric" min="1" type="number" defaultValue="1" required />
            </label>
            <label>
              Cost per item, optional
              <input name="unit_cost" inputMode="decimal" min="0" step="0.01" type="number" placeholder="0" />
            </label>
            <button type="submit">Save stock</button>
          </form>
        )}
      </section>

      {tenant.role === "OWNER" && (
        <section className="panel secondaryPanel" id="new-item">
          <h2>Create new item</h2>
          <p className="muted">Add the item and its starting stock in one step.</p>
          <form action="/api/products" method="post" className="form">
            <label>
              Item name
              <input name="name" placeholder="English Textbook" required />
            </label>
            <label>
              Selling price
              <input name="selling_price" inputMode="decimal" min="0.01" step="0.01" type="number" placeholder="8000" required />
            </label>
            <label>
              Size / class, optional
              <input name="variant_name" placeholder="Size 10 or JSS 1" />
            </label>
            <label>
              Barcode, optional
              <input id="new-item-barcode" name="barcode" autoComplete="off" inputMode="numeric" placeholder="Scan above or type barcode" />
            </label>
            <label>
              Starting stock
              <input name="starting_stock" inputMode="numeric" min="0" type="number" defaultValue="0" required />
            </label>
            <label>
              Cost price, optional
              <input name="cost_price" inputMode="decimal" min="0" step="0.01" type="number" placeholder="0" />
            </label>
            <button type="submit" className="buttonSecondary">Create item</button>
          </form>
        </section>
      )}
    </main>
  );
}
