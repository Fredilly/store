"use client";

import { useRef, useState } from "react";

type BarcodeScannerProps = {
  targetSelectId?: string;
  unknownBarcodeInputId?: string;
};

type LookupResult = {
  found: boolean;
  variantId?: string;
  label?: string;
  stock?: number;
};

function stopVideo(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) track.stop();
  }
  if (video) video.srcObject = null;
}

export function BarcodeScanner({
  targetSelectId,
  unknownBarcodeInputId,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  async function scan() {
    if (scanning) return;

    setScanning(true);
    setMessage("Point the camera at the barcode.");

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current ?? undefined);
      const code = result.getText().trim();

      stopVideo(videoRef.current);

      if (!code) {
        setMessage("No barcode was read. Try again or choose the item manually.");
        return;
      }

      const response = await fetch(`/api/scan-codes?code=${encodeURIComponent(code)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Barcode lookup failed");
      }

      const lookup = (await response.json()) as LookupResult;

      if (lookup.found && lookup.variantId) {
        if (targetSelectId) {
          const select = document.getElementById(targetSelectId) as HTMLSelectElement | null;
          const option = select?.querySelector(
            `option[value="${CSS.escape(lookup.variantId)}"]`
          );

          if (select && option) {
            select.value = lookup.variantId;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            setMessage(`Found: ${lookup.label ?? "item"}.`);
            select.focus();
            return;
          }

          if (lookup.stock !== undefined && lookup.stock <= 0) {
            setMessage(`${lookup.label ?? "This item"} is out of stock.`);
            return;
          }
        }

        setMessage(`Found: ${lookup.label ?? "item"}.`);
        return;
      }

      if (unknownBarcodeInputId) {
        const input = document.getElementById(unknownBarcodeInputId) as HTMLInputElement | null;
        if (input) {
          input.value = code;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          setMessage("New barcode. Create the item below; the barcode is already filled in.");
          return;
        }
      }

      setMessage("Barcode not found. Choose the item manually.");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") {
        setMessage("Camera access was blocked. Allow camera access or choose the item manually.");
      } else if (name === "NotFoundError") {
        setMessage("No camera was found. Choose the item manually.");
      } else {
        setMessage("Could not scan the barcode. Try again or choose the item manually.");
      }
    } finally {
      stopVideo(videoRef.current);
      setScanning(false);
    }
  }

  return (
    <div className="scanner">
      <button type="button" className="scanButton" onClick={scan} disabled={scanning}>
        {scanning ? "Scanning…" : "Scan barcode"}
      </button>
      <video
        ref={videoRef}
        className={scanning ? "scannerVideo scannerVideoActive" : "scannerVideo"}
        autoPlay
        muted
        playsInline
      />
      {message && <p className="scannerMessage" aria-live="polite">{message}</p>}
    </div>
  );
}
