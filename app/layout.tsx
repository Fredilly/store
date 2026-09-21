import type { Metadata, Viewport } from "next";
import { FormSubmitGuard } from "../components/form-submit-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Ledger",
  description: "Simple inventory and sales records for schools.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "School Ledger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2556d8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><FormSubmitGuard />{children}</body>
    </html>
  );
}
