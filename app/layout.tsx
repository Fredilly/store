import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Ledger",
  description: "Simple inventory and sales records for schools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
