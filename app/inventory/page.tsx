import Link from "next/link";
import { Icon } from "../../components/Icon";
import { InventoryBrowser } from "../../components/inventory-browser";
import { listVariants } from "../../lib/queries";
import { requirePageTenant } from "../../lib/tenant";

export default async function InventoryPage() {
  const tenant = await requirePageTenant();
  const variants = await listVariants(tenant.orgId);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/"><Icon name="home" size={19} className="backIcon" /><span>Home</span></Link>
        <p className="eyebrow">Stock</p>
        <h1>What you have</h1>
        <p className="muted">Search by item name or category. Low and out-of-stock items are one tap away.</p>
      </div>

      {variants.length === 0 ? (
        <div className="panel">
          <p className="muted">No items yet.</p>
          <Link className="inlineAction" href="/stock">Create an item →</Link>
        </div>
      ) : (
        <InventoryBrowser items={variants} />
      )}
    </main>
  );
}
