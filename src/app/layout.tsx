import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAVA · Rent virtual numbers for instant OTP verification",
  description:
    "Rent disposable phone numbers from Nigeria, USA, UK, Ghana, India and 12+ more countries to receive one-time passwords for Match, Zoosk, Gmail, PayPal, Venmo, WhatsApp and 30+ services.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
