import Link from "next/link";
import { requirePageOwner } from "../../lib/tenant";

const exports = [
  ["Products", "products", "Product names, variants, prices, and status"],
  ["Current inventory", "inventory", "Current stock for every active item"],
  ["Stock movement history", "stock-movements", "Every stock increase and decrease"],
  ["Sales", "sales", "Sale totals, customers, and who recorded them"],
  ["Payments", "payments", "Payment history linked to sales"],
  ["Expenses", "expenses", "Recorded expenses"],
  ["Audit events", "audit-events", "Permanent activity history"],
] as const;

export default async function ExportPage() {
  await requirePageOwner();

  return (
    <main className="shell">
      <div className="pageTop">
        <Link className="back" href="/">← Home</Link>
        <p className="eyebrow">Backup</p>
        <h1>Export records</h1>
        <p className="muted">
          Download a copy of your school records. Only the owner can access these exports.
        </p>
      </div>

      <section className="panel">
        <div className="balanceList">
          {exports.map(([label, kind, detail]) => (
            <div className="balanceRow exportRow" key={kind}>
              <div>
                <strong>{label}</strong>
                <span>{detail}</span>
              </div>
              <a className="inlineAction exportAction" href={`/api/export/${kind}`}>
                Download CSV
              </a>
            </div>
          ))}
        </div>
      </section>

      <p className="muted">
        These downloads are independent copies for review and safekeeping. Cloudflare D1
        point-in-time recovery is also documented for system recovery.
      </p>
    </main>
  );
}
