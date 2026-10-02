"use client";

import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  const payments = [
    {
      name: "Paystack (NGN)",
      icon: "https://flagcdn.com/w40/ng.png",
      label: "Bank Transfer & Cards",
    },
    {
      name: "USDT (TRX)",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=025",
      label: "Tron Network",
    },
    {
      name: "Bitcoin (BTC)",
      icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=025",
      label: "Bitcoin Network",
    },
    {
      name: "Litecoin (LTC)",
      icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=025",
      label: "Litecoin Network",
    },
  ];

  return (
    <footer className="border-t border-slate-800/80 bg-[#090e1a] mt-10 md:mt-16 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Top Row: Brand + Trust + Status */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center text-lg">N</span>
              <span className="text-lg font-black tracking-wider text-emerald-500">NAVA</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Real mobile Non-VoIP numbers for instant OTP verification. White-labeled, encrypted, and built for speed.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Systems Operational · 99.9% Uptime
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Product</span>
              <Link href="/dashboard" className="block text-gray-300 hover:text-emerald-400 transition-colors">Rent a number</Link>
              <Link href="/dashboard/rentals" className="block text-gray-300 hover:text-emerald-400 transition-colors">My rentals</Link>
              <Link href="/dashboard/wallet" className="block text-gray-300 hover:text-emerald-400 transition-colors">Wallet & Top Up</Link>
              <Link href="/dashboard/otp" className="block text-gray-300 hover:text-emerald-400 transition-colors">Price list</Link>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Support</span>
              <Link href="/dashboard/support" className="block text-gray-300 hover:text-emerald-400 transition-colors">Help & Support</Link>
              <Link href="/dashboard/support" className="block text-gray-300 hover:text-emerald-400 transition-colors">Contact us</Link>
              <span className="block text-gray-500">Auto-refund if no SMS</span>
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Trust</span>
              <span className="block text-gray-300">100% Real Mobile / Non-VoIP</span>
              <span className="block text-gray-300">Encrypted Paystack & Crypto</span>
              <span className="block text-gray-300">Supplier identity hidden</span>
            </div>
          </div>
        </div>

        {/* Accepted Payment Options */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            Accepted Payment Methods
          </span>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {payments.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2 bg-[#0d1526] border border-slate-800 rounded-xl px-3 py-2 text-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-[#152035] border border-slate-700/80 flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <img
                    src={p.icon}
                    alt={p.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-white block truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-500 block truncate">{p.label}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500">
            Baseline rate 1 USD = ₦1,500 · Crypto deposits auto-verified on-chain · Paystack instant NGN
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-gray-500">
          <span>© {year} NAVA. All rights reserved. B2C OTP verification platform.</span>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/support" className="hover:text-emerald-400 transition-colors">Privacy</Link>
            <Link href="/dashboard/support" className="hover:text-emerald-400 transition-colors">Terms</Link>
            <Link href="/dashboard/support" className="hover:text-emerald-400 transition-colors">Refund Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}