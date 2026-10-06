"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface GuideItem {
  id: string;
  title: string;
  category: "eSIM & Wi-Fi Calling" | "Disposable OTP" | "Wallet & Payments";
  summary: string;
  steps: string[];
}

export default function SupportCenterPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [openGuideId, setOpenGuideId] = useState<string | null>("guide-1");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [recoverySessions, setRecoverySessions] = useState<any[]>([]);
  const [recoveryReports, setRecoveryReports] = useState<any[]>([]);
  const [recoveryIntentId, setRecoveryIntentId] = useState("");
  const [recoveryCoin, setRecoveryCoin] = useState("USDT");
  const [recoveryTxHash, setRecoveryTxHash] = useState("");
  const [recoveryAmount, setRecoveryAmount] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("late_payment");
  const [recoveryNotes, setRecoveryNotes] = useState("");
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryError, setRecoveryError] = useState("");

  // Sync Nava Theme
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    };
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  useEffect(() => {
    const loadRecoveryData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;

        const res = await fetch("/api/crypto/recovery", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        setRecoverySessions(data.sessions || []);
        setRecoveryReports(data.reports || []);
      } catch {
        // Recovery reporting remains available even if history loading fails.
      }
    };

    loadRecoveryData();
  }, []);

  const handleCryptoRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverySubmitting(true);
    setRecoveryMessage("");
    setRecoveryError("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Session expired. Please log in again.");

      const res = await fetch("/api/crypto/recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          depositIntentId: recoveryIntentId || undefined,
          coin: recoveryCoin,
          txHash: recoveryTxHash,
          claimedAmountUsd: recoveryAmount || undefined,
          reason: recoveryReason,
          notes: recoveryNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to submit crypto payment report.");

      setRecoveryMessage(data.message || "Report submitted for admin review.");
      setRecoveryTxHash("");
      setRecoveryAmount("");
      setRecoveryNotes("");

      const refresh = await fetch("/api/crypto/recovery", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (refresh.ok) {
        const refreshed = await refresh.json();
        setRecoverySessions(refreshed.sessions || []);
        setRecoveryReports(refreshed.reports || []);
      }
    } catch (err: any) {
      setRecoveryError(err?.message || "Unable to submit crypto payment report.");
    } finally {
      setRecoverySubmitting(false);
    }
  };

  // Quick 10-Second Guides
  const guides: GuideItem[] = [
    {
      id: "guide-1",
      title: "How to Enable Overseas Wi-Fi Calling (for T-Mobile eSIM)",
      category: "eSIM & Wi-Fi Calling",
      summary: "Receive texts and calls anywhere in the world over your local Wi-Fi connection.",
      steps: [
        "Go to iPhone Settings > Cellular (or Mobile Data).",
        "Select your new T-Mobile eSIM line.",
        "Tap 'Wi-Fi Calling' and switch it to ON.",
        "Connect to any local Wi-Fi network — your phone will now display 'T-Mobile Wi-Fi' and receive texts globally!"
      ],
    },
    {
      id: "guide-2",
      title: "How to Check if Your iPhone is Carrier Unlocked (SIM-Free)",
      category: "eSIM & Wi-Fi Calling",
      summary: "Make sure your iPhone accepts new eSIMs before ordering a line.",
      steps: [
        "Open iPhone Settings > General > About.",
        "Scroll down to 'Carrier Lock'.",
        "If it says 'No SIM restrictions', your iPhone is 100% unlocked and ready for eSIM!",
        "If it displays a carrier name, contact your network to unlock your phone before ordering."
      ],
    },
    {
      id: "guide-3",
      title: "What to Do If an OTP Verification Code Takes Longer Than 2 Minutes",
      category: "Disposable OTP",
      summary: "How our zero-risk automatic refund guarantee protects your money.",
      steps: [
        "Wait 60–90 seconds for the carrier signal to transmit.",
        "If no code arrives after 3 minutes, tap 'Cancel & Refund' inside your OtpDrawer.",
        "Your wallet balance is refunded instantly 100% — you are ONLY charged when a code actually arrives!",
        "Try ordering a different number or country for that app."
      ],
    },
    {
      id: "guide-4",
      title: "How to Scan Your eSIM QR Code If You Only Have One Phone",
      category: "eSIM & Wi-Fi Calling",
      summary: "No second screen? Use manual activation details in 30 seconds.",
      steps: [
        "Open 'My Lines' on your NAVA dashboard and tap 'View / Scan eSIM'.",
        "Tap 'Copy Full LPA Code' under Manual Activation Details.",
        "On your iPhone, go to Settings > Cellular > Add eSIM > Use QR Code > Enter Details Manually.",
        "Paste the SM-DP+ address and Activation Code into the boxes and tap Next!"
      ],
    },
  ];

  const categories = ["All", "eSIM & Wi-Fi Calling", "Disposable OTP", "Wallet & Payments"];

  const filteredGuides = guides.filter(
    (g) => activeCategory === "All" || g.category === activeCategory
  );

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800/80 shadow-md",
        cardMuted: "bg-[#0f172a]/60 border border-slate-800",
        innerCard: "bg-[#070d19] border border-slate-800/80",
        text: "text-white",
        textMuted: "text-gray-400",
        textSubtle: "text-gray-500",
        pillActive: "bg-emerald-500 text-black font-bold shadow-sm",
        pillInactive: "bg-[#0f172a] text-gray-400 hover:text-white hover:bg-slate-800",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        cardMuted: "bg-white border-2 border-slate-300 shadow-sm",
        innerCard: "bg-slate-50 border-2 border-slate-200",
        text: "text-slate-900",
        textMuted: "text-slate-600 font-medium",
        textSubtle: "text-slate-500",
        pillActive: "bg-emerald-500 text-white font-bold shadow-sm",
        pillInactive: "bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-900 font-semibold",
      };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${theme.text}`}>Help & 24/7 Support Desk</h1>
        <p className={`${theme.textMuted} text-xs mt-0.5`}>
          Chat directly with our support team or browse quick 10-second how-to guides.
        </p>
      </div>

      {/* Direct Contact Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* WhatsApp Direct Chat */}
        <div className={`${theme.card} rounded-2xl p-5 space-y-3 relative overflow-hidden`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center shrink-0">
              <img
                src="https://api.iconify.design/simple-icons:whatsapp.svg?color=%2325D366"
                alt="WhatsApp"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${theme.text}`}>WhatsApp Support</h3>
              <p className="text-[10px] text-emerald-400 font-bold">● Average reply: &lt; 5 mins</p>
            </div>
          </div>
          <p className={`text-xs ${theme.textSubtle} leading-relaxed`}>
            Chat with a live agent for instant order help, eSIM activations, or billing questions.
          </p>
          <a
            href="https://wa.me/15550000000?text=Hi%20NAVA%20Support,%20I%20need%20help%20with%20my%20order"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
          >
            Chat on WhatsApp →
          </a>
        </div>

        {/* Telegram Direct Desk */}
        <div className={`${theme.card} rounded-2xl p-5 space-y-3 relative overflow-hidden`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#26A5E4]/10 border border-[#26A5E4]/30 flex items-center justify-center shrink-0">
              <img
                src="https://api.iconify.design/simple-icons:telegram.svg?color=%2326A5E4"
                alt="Telegram"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${theme.text}`}>Telegram Support Desk</h3>
              <p className="text-[10px] text-sky-400 font-bold">● 24/7 Live Concierge</p>
            </div>
          </div>
          <p className={`text-xs ${theme.textSubtle} leading-relaxed`}>
            Connect with our VIP support desk on Telegram for custom bulk requests and support.
          </p>
          <a
            href="https://t.me/navasupport"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full bg-[#26A5E4] hover:bg-[#1f93d1] text-white font-black text-xs py-2.5 rounded-xl transition-all shadow-md shadow-[#26A5E4]/20 cursor-pointer"
          >
            Open Telegram Desk →
          </a>
        </div>

        {/* Guaranteed Refunds Banner */}
        <div className={`${theme.card} rounded-2xl p-5 space-y-3 flex flex-col justify-between`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-md border border-emerald-500/30">
              Zero-Risk Policy
            </span>
            <h3 className={`text-sm font-bold ${theme.text} mt-2`}>Auto Refund Guarantee</h3>
            <p className={`text-xs ${theme.textSubtle} leading-relaxed mt-1`}>
              Never lose money on failed codes. If a disposable OTP does not arrive within 15 minutes, your wallet is automatically refunded 100%.
            </p>
          </div>
          <Link
            href="/dashboard/wallet"
            className="text-xs text-emerald-500 font-bold hover:underline"
          >
            View Wallet Balance →
          </Link>
        </div>
      </div>

      {/* Crypto Payment Recovery */}
      <div className={`${theme.card} rounded-2xl p-5 sm:p-6 space-y-4`}>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-md border border-amber-500/30">
            Exceptional Payment Help
          </span>
          <h2 className={`text-base font-bold ${theme.text} mt-2`}>🛟 Report a Crypto Payment</h2>
          <p className={`text-xs ${theme.textMuted} mt-1 leading-relaxed`}>
            Use this only for a late, duplicate, or otherwise unmatched payment. Normal deposits should always be made from a fresh active deposit session.
          </p>
        </div>

        <form onSubmit={handleCryptoRecoverySubmit} className="space-y-3">
          <select
            value={recoveryIntentId}
            onChange={(e) => {
              const id = e.target.value;
              setRecoveryIntentId(id);
              const selected = recoverySessions.find((session) => session.id === id);
              if (selected) {
                setRecoveryCoin(String(selected.coin).toUpperCase());
                setRecoveryAmount(Number(selected.expected_amount_usd).toFixed(2));
              }
            }}
            className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
          >
            <option value="">No specific deposit session (unmatched payment)</option>
            {recoverySessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.coin} • ${Number(session.expected_amount_usd).toFixed(2)} • {session.status} • {new Date(session.created_at).toLocaleString()}
              </option>
            ))}
          </select>

          {!recoveryIntentId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={recoveryCoin}
                onChange={(e) => setRecoveryCoin(e.target.value)}
                className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
              >
                <option value="USDT">USDT / TRC20</option>
                <option value="BTC">BTC / Bitcoin</option>
                <option value="LTC">LTC / Litecoin</option>
              </select>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount you paid (USD)"
                value={recoveryAmount}
                onChange={(e) => setRecoveryAmount(e.target.value)}
                className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
                required
              />
            </div>
          )}

          <select
            value={recoveryReason}
            onChange={(e) => setRecoveryReason(e.target.value)}
            className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
          >
            <option value="late_payment">I paid after my deposit session expired</option>
            <option value="duplicate_payment">I accidentally paid twice</option>
            <option value="unmatched_payment">My payment is not showing in my wallet</option>
            <option value="other">Other crypto payment issue</option>
          </select>

          <input
            type="text"
            placeholder="Transaction Hash"
            value={recoveryTxHash}
            onChange={(e) => setRecoveryTxHash(e.target.value.trim())}
            className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
            required
          />

          <textarea
            placeholder="Optional details for support..."
            value={recoveryNotes}
            onChange={(e) => setRecoveryNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white resize-y"
          />

          {recoveryMessage && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              {recoveryMessage}
            </p>
          )}

          {recoveryError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {recoveryError}
            </p>
          )}

          <button
            type="submit"
            disabled={recoverySubmitting}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black text-xs py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {recoverySubmitting ? "Submitting Report..." : "Report Payment for Review"}
          </button>
        </form>

        {recoveryReports.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Recent Crypto Reports</p>
            {recoveryReports.slice(0, 5).map((report) => (
              <div key={report.id} className={`${theme.innerCard} rounded-xl p-3 text-xs`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{report.coin} • {report.tx_hash}</span>
                  <span className="uppercase text-[9px] font-black text-amber-400">{report.status}</span>
                </div>
                <p className={`text-[10px] ${theme.textSubtle} mt-1`}>
                  {report.reason.replaceAll("_", " ")} • {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Quick Guides Accordion */}
      <div className={`${theme.card} rounded-2xl p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className={`text-base font-bold ${theme.text}`}>10-Second Quick Guides</h2>
            <p className={`text-xs ${theme.textMuted}`}>Fast solutions to the most common questions.</p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat ? theme.pillActive : theme.pillInactive
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-2.5 pt-2">
          {filteredGuides.map((guide) => {
            const isOpen = openGuideId === guide.id;

            return (
              <div
                key={guide.id}
                className={`${theme.innerCard} rounded-2xl border transition-all overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => setOpenGuideId(isOpen ? null : guide.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                      {guide.category}
                    </span>
                    <h3 className={`text-xs sm:text-sm font-bold ${theme.text}`}>{guide.title}</h3>
                  </div>
                  <span className={`text-xs font-bold ${theme.textMuted} shrink-0`}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/40 space-y-3 animate-fadeIn">
                    <p className={`text-xs ${theme.textMuted} leading-relaxed`}>{guide.summary}</p>
                    
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Step-by-step:
                      </p>
                      <ol className="space-y-2 text-xs">
                        {guide.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span className={`${theme.text} leading-relaxed`}>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}