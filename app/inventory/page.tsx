import Link from "next/link";

export default function InventoryPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Inventory</p>
      <h1>What is left</h1>
      <p className="muted">Inventory totals will come from the stock ledger.</p>
      <p><Link href="/">← Home</Link></p>
    </main>
  );
}
