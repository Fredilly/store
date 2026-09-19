export function toMinor(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid amount.");
  }
  return Math.round(amount * 100);
}

export function formatNaira(minor: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}
