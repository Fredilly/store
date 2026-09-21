import { db } from "../../../../lib/db";
import { dailySummary, listRecentTransactions } from "../../../../lib/queries";
import { requireOwner } from "../../../../lib/tenant";

const labels: Record<string, string> = {
  SALE_CREATED: "Sale",
  SALE_VOIDED: "Sale voided",
  STOCK_RECEIVED: "Stock added",
  STOCK_CORRECTED: "Stock corrected",
  PAYMENT_RECORDED: "Payment received",
  PAYMENT_CORRECTED: "Payment corrected",
  EXPENSE_RECORDED: "Expense",
};

function money(minor: number) {
  return `NGN ${Math.round(minor / 100).toLocaleString("en-NG")}`;
}

function ascii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(value: string, max = 82) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function transactionDetails(metadataJson: string | null) {
  if (!metadataJson) return [] as string[];

  try {
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    const details: string[] = [];

    if (typeof metadata.customerName === "string" && metadata.customerName) details.push(`Customer: ${metadata.customerName}`);
    if (typeof metadata.quantity === "number") details.push(`Quantity: ${metadata.quantity}`);
    if (typeof metadata.totalMinor === "number") details.push(`Sale total: ${money(metadata.totalMinor)}`);
    if (typeof metadata.amountPaidMinor === "number") details.push(`Paid: ${money(metadata.amountPaidMinor)}`);
    if (typeof metadata.amountMinor === "number") details.push(`Amount: ${money(metadata.amountMinor)}`);
    if (typeof metadata.adjustmentMinor === "number") details.push(`Correction: ${money(Math.abs(metadata.adjustmentMinor))}`);
    if (typeof metadata.description === "string" && metadata.description) details.push(metadata.description);
    if (typeof metadata.reason === "string" && metadata.reason) details.push(`Reason: ${metadata.reason}`);
    if (typeof metadata.quantityDelta === "number") details.push(`Stock change: ${metadata.quantityDelta > 0 ? "+" : ""}${metadata.quantityDelta}`);

    return details;
  } catch {
    return [];
  }
}

function makePdf(lines: string[]) {
  const pages: string[][] = [];
  const maxLines = 48;

  for (let i = 0; i < lines.length; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines));
  }
  if (pages.length === 0) pages.push(["No history available."]);

  const objects: string[] = [];
  const fontId = 3;
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const streamIds = pages.map((_, index) => 5 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const streamId = streamIds[index];
    const commands = [
      "BT",
      "/F1 10 Tf",
      "48 795 Td",
      "14 TL",
      ...pageLines.flatMap((line, lineIndex) => [
        `(${ascii(line)}) Tj`,
        lineIndex < pageLines.length - 1 ? "T*" : "",
      ]).filter(Boolean),
      "ET",
    ].join("\n");

    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export async function GET(request: Request) {
  let tenant;
  try {
    tenant = await requireOwner(request.headers);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const [summary, transactions] = await Promise.all([
    dailySummary(tenant.orgId),
    listRecentTransactions(tenant.orgId),
  ]);

  const lines: string[] = [
    "School Ledger",
    tenant.orgName,
    "Daily summary and recent transaction history",
    "",
    `Sold today: ${money(summary.sales)}`,
    `Received today: ${money(summary.received)}`,
    `Still owed: ${money(summary.outstanding)}`,
    `Expenses today: ${money(summary.expenses)}`,
    "",
    "Recent transactions",
    "",
  ];

  for (const item of transactions) {
    const actor = item.actor_name || item.actor_email || "Unknown user";
    const title = labels[item.event_type] || item.event_type;
    const base = `${item.created_at} | ${title} | ${actor}`;
    lines.push(...wrap(base));

    for (const detail of transactionDetails(item.metadata_json)) {
      lines.push(...wrap(`  ${detail}`, 78));
    }
    lines.push("");
  }

  await db()
    .prepare(
      `INSERT INTO audit_events (
        id,
        organization_id,
        actor_user_id,
        event_type,
        entity_type,
        entity_id,
        metadata_json
      ) VALUES (?, ?, ?, 'DATA_EXPORTED', 'export', 'history-pdf', ?)`
    )
    .bind(
      crypto.randomUUID(),
      tenant.orgId,
      tenant.userId,
      JSON.stringify({ kind: "history-pdf" })
    )
    .run();

  return new Response(makePdf(lines), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="school-ledger-history.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
