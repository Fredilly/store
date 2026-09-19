import Link from "next/link";

export default function SellPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Sell Item</p>
      <h1>Record a sale</h1>
      <p className="muted">Product selection and payment entry are next.</p>
      <p><Link href="/">← Home</Link></p>
    </main>
  );
}
