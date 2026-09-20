"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";

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

type ScannerControls = {
  stop: () => void;
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
  const controlsRef = useRef<ScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    stopVideo(videoRef.current);
    setScanning(false);
  }

  async function scan() {
    if (scanning) return;

    if (!window.isSecureContext) {
      setMessage("Camera scanning needs a secure HTTPS connection. Choose the item manually.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("This browser cannot open the camera. Try Safari/Chrome or choose the item manually.");
      return;
    }

    setScanning(true);
    setMessage("Opening rear camera… Point it at the barcode.");

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const code = await new Promise<string>((resolve, reject) => {
        let settled = false;

        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          controlsRef.current?.stop();
          reject(Object.assign(new Error("Barcode scan timed out"), { name: "ScanTimeoutError" }));
        }, 20000);

        reader
          .decodeFromConstraints(
            constraints,
            videoRef.current ?? undefined,
            (result, _error, controls) => {
              controlsRef.current = controls;

              if (!result || settled) return;

              settled = true;
              window.clearTimeout(timeout);
              controls.stop();
              resolve(result.getText().trim());
            }
          )
          .then((controls) => {
            controlsRef.current = controls;
          })
          .catch((error) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            reject(error);
          });
      });

      controlsRef.current = null;
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

      if (name === "NotAllowedError" || name === "SecurityError") {
        setMessage("Camera access is blocked. Allow camera access for this site, then try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMessage("No usable camera was found. Choose the item manually.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setMessage("The camera is busy in another app. Close it there, then try again.");
      } else if (name === "OverconstrainedError") {
        setMessage("This camera could not start with the requested settings. Try again.");
      } else if (name === "ScanTimeoutError") {
        setMessage("No barcode detected after 20 seconds. Move closer, improve lighting, and try again.");
      } else {
        setMessage("Could not scan the barcode. Try again or choose the item manually.");
      }
    } finally {
      controlsRef.current?.stop();
      controlsRef.current = null;
      stopVideo(videoRef.current);
      setScanning(false);
    }
  }

  return (
    <div className="scanner">
      <div className="scannerActions">
        <button type="button" className="scanButton" onClick={scan} disabled={scanning}>
          <Icon name="camera" size={22} className="buttonIcon" />
          <span>{scanning ? "Scanning…" : "Scan barcode"}</span>
        </button>
        {scanning && (
          <button type="button" className="buttonSecondary" onClick={stopScanner}>
            Cancel
          </button>
        )}
      </div>
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
