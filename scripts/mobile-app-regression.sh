#!/usr/bin/env bash
set -euo pipefail

grep -q 'display: "standalone"' app/manifest.ts
grep -q 'start_url: "/"' app/manifest.ts
grep -q 'appleWebApp' app/layout.tsx
grep -q 'viewportFit: "cover"' app/layout.tsx
grep -q 'FormSubmitGuard' app/layout.tsx
grep -q 'Saving…' components/form-submit-guard.tsx
grep -q 'tap Allow camera' components/BarcodeScanner.tsx
grep -q 'env(safe-area-inset-bottom)' app/globals.css
grep -q 'button\[aria-busy="true"\]' app/globals.css
grep -q 'icon.svg' app/manifest.ts

echo "PASS: mobile app polish acceptance"
