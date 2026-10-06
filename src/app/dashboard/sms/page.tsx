"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SmsComingSoonPage() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    };
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800 shadow-md",
        innerCard: "bg-[#070d19] border border-slate-800/80",
        text: "text-white",
        textMuted: "text-gray-400",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        innerCard: "bg-slate-50 border-2 border-slate-200",
        text: "text-slate-900",
        textMuted: "text-slate-600 font-medium",
      };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Phone</h1>
        <p className={`${theme.textMuted} text-xs mt-0.5`}>
          Phone services are currently in development and coming soon.
        </p>
      </div>

      {/* Feature Teaser Card */}
      <div className={`${theme.card} rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 my-8`}>
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-md">
          📱
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-pink-950/50 text-pink-400 px-3 py-1 rounded-full border border-pink-500/30">
            Feature In Development
          </span>
          <h2 className={`text-xl font-bold ${theme.text}`}>Web SMS Dispatcher Coming Soon</h2>
          <p className={`text-xs ${theme.textMuted} leading-relaxed max-w-md mx-auto`}>
            We are upgrading our high-throughput T-Mobile cellular gateway routes. Web-based outbound SMS broadcasting will be enabled shortly.
          </p>
        </div>

        {/* Existing Services CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            📞 Get Instant Disposable OTP
          </Link>
          <Link
            href="/dashboard/rentals"
            className={`${theme.innerCard} hover:border-slate-500 text-xs font-bold px-6 py-3 rounded-xl transition-all border`}
          >
            📱 Rent 30-Day T-Mobile eSIM Line
          </Link>
        </div>
      </div>
    </div>
  );
}