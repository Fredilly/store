import Link from "next/link";

export default function StockPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Add Stock</p>
      <h1>Record stock received</h1>
      <p className="muted">Product and quantity entry are next.</p>
      <p><Link href="/">← Home</Link></p>
    </main>
  );
}
