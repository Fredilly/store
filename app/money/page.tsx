import Link from "next/link";

export default function MoneyPage() {
  return (
    <main className="shell">
      <p className="eyebrow">Money</p>
      <h1>Money summary</h1>
      <p className="muted">Sales, received payments, and outstanding balances will appear here.</p>
      <p><Link href="/">← Home</Link></p>
    </main>
  );
}
