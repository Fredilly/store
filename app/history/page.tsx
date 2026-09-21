import Link from "next/link";
import { Icon } from "../../components/Icon";
import { HistoryActions } from "../../components/history-actions";
import { formatNaira } from "../../lib/money";
import { listRecentTransactions } from "../../lib/queries";
import { requirePageOwner } from "../../lib/tenant";

const labels: Record<string, string> = {
  SALE_CREATED: "Sale",
  SALE_VOIDED: "Sale voided",
  STOCK_RECEIVED: "Stock added",
  STOCK_CORRECTED: "Stock corrected",
  PAYMENT_RECORDED: "Payment received",
  PAYMENT_CORRECTED: "Payment corrected",
  EXPENSE_RECORDED: "Expense",
};

function details(value: string | null) {
  if (!value) return [] as string[];

  try {
    const metadata = JSON.parse(value) as Record<string, unknown>;
    const out: string[] = [];

    if (typeof metadata.customerName === "string" && metadata.customerName) {
      out.push(`Customer: ${metadata.customerName}`);
    }
    if (typeof metadata.quantity === "number") out.push(`Quantity: ${metadata.quantity}`);
    if (typeof metadata.totalMinor === "number") out.push(`Sale total: ${formatNaira(metadata.totalMinor)}`);
    if (typeof metadata.amountPaidMinor === "number") out.push(`Paid: ${formatNaira(metadata.amountPaidMinor)}`);
    if (typeof metadata.amountMinor === "number") out.push(`Amount: ${formatNaira(metadata.amountMinor)}`);
    if (typeof metadata.adjustmentMinor === "number") out.push(`Correction: ${formatNaira(Math.abs(metadata.adjustmentMinor))}`);
    if (typeof metadata.description === "string") out.push(metadata.description);
    if (typeof metadata.reason === "string" && metadata.reason) out.push(`Reason: ${metadata.reason}`);
    if (typeof metadata.quantityDelta === "number") out.push(`Stock change: ${metadata.quantityDelta > 0 ? "+" : ""}${metadata.quantityDelta}`);

    return out;
  } catch {
    return [];
  }
}

export default async function HistoryPage() {
  const tenant = await requirePageOwner();
  const transactions = await listRecentTransactions(tenant.orgId);

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/"><Icon name="home" size={19} className="backIcon" /><span>Home</span></Link>
        <p className="eyebrow">History</p>
        <h1>What happened</h1>
        <p className="muted">Recent sales, stock, payments, corrections, and expenses. Tap any row for details.</p>
        <HistoryActions />
      </div>

      <section className="panel">
        {transactions.length === 0 ? (
          <p className="muted">No transactions yet.</p>
        ) : (
          <div className="historyList">
            {transactions.map((item) => {
              const info = details(item.metadata_json);
              const actor = item.actor_name || item.actor_email || "Unknown user";

              return (
                <details className="historyRow" key={item.id}>
                  <summary>
                    <div>
                      <strong>{labels[item.event_type] || item.event_type}</strong>
                      <span>{actor}</span>
                    </div>
                    <time>{item.created_at}</time>
                  </summary>
                  <div className="historyDetails">
                    {info.length > 0 ? info.map((line) => <span key={line}>{line}</span>) : <span>No extra details.</span>}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
