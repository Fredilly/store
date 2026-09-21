"use client";

export function HistoryActions() {
  async function sharePdf() {
    const response = await fetch("/api/history/pdf", { cache: "no-store" });
    if (!response.ok) {
      window.location.href = "/api/history/pdf";
      return;
    }

    const blob = await response.blob();
    const file = new File([blob], "school-ledger-history.pdf", { type: "application/pdf" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "School Ledger history",
        text: "School Ledger daily summary and recent transaction history.",
        files: [file],
      });
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="historyActions" aria-label="History actions">
      <a className="inlineAction" href="/api/history/pdf">Download PDF</a>
      <button className="historyShareButton" type="button" onClick={sharePdf}>Share</button>
    </div>
  );
}
