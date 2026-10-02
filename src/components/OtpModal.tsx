"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface OtpModalProps {
  isOpen?: boolean;
  order?: {
    id?: string;
    phone_number?: string;
    service_name?: string;
    country_code?: string;
    price_usd?: number;
    status?: string;
    created_at?: string;
    logo?: string;
  } | null;

  orderId?: string;
  id?: string;
  phoneNumber?: string;
  phone_number?: string;
  phone?: string;
  serviceName?: string;
  service_name?: string;
  service?: string;
  countryCode?: string;
  country_code?: string;
  country?: string;
  priceUsd?: number;
  price_usd?: number;
  price?: number;
  createdAt?: string;
  created_at?: string;
  onClose: () => void;
  onBalanceUpdate?: (newBalance: number) => void;
}

export default function OtpModal(props: OtpModalProps) {
  if (props.isOpen === false) {
    return null;
  }

  const activeOrder = props.order;

  const activeOrderId = props.orderId || props.id || activeOrder?.id || "";
  const activePhoneNumber =
    props.phoneNumber || props.phone_number || props.phone || activeOrder?.phone_number || "Allocating line...";
  const activeServiceName =
    props.serviceName || props.service_name || props.service || activeOrder?.service_name || "Verification Service";
  const activeCountryCode =
    props.countryCode || props.country_code || props.country || activeOrder?.country_code || "US";
  const activePriceUsd =
    props.priceUsd ?? props.price_usd ?? props.price ?? activeOrder?.price_usd ?? 0.0;
  const activeCreatedAt =
    props.createdAt || props.created_at || activeOrder?.created_at;

  const [smsCode, setSmsCode] = useState<string | null>(null);
  const [fullMessage, setFullMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [status, setStatus] = useState<"waiting" | "received" | "expired">("waiting");
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const refundCalledRef = useRef(false);

  const getServiceSlug = (name?: string) => {
    if (!name) return "messagebird";
    const n = name.toLowerCase();
    if (n.includes("chatgpt") || n.includes("openai")) return "openai";
    if (n.includes("whatsapp")) return "whatsapp";
    if (n.includes("telegram")) return "telegram";
    if (n.includes("tiktok")) return "tiktok";
    if (n.includes("google") || n.includes("gmail")) return "google";
    if (n.includes("facebook")) return "facebook";
    if (n.includes("instagram")) return "instagram";
    if (n.includes("twitter") || n.includes("x")) return "x";
    if (n.includes("tinder")) return "tinder";
    return "messagebird";
  };

  const handleCopyPhone = () => {
    if (!activePhoneNumber || activePhoneNumber === "Allocating line...") return;
    navigator.clipboard.writeText(activePhoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyCode = () => {
    if (smsCode) {
      navigator.clipboard.writeText(smsCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Trigger Backend Auto-Refund on Timeout
  const triggerAutoRefund = useCallback(async () => {
    if (!activeOrderId || refundCalledRef.current) return;
    refundCalledRef.current = true;
    try {
      const res = await fetch("/api/rentals/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: activeOrderId }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.newBalance !== undefined && props.onBalanceUpdate) {
        props.onBalanceUpdate(data.newBalance);
      }
    } catch (e) {
      console.error("Auto-refund call failed:", e);
    }
  }, [activeOrderId, props]);

  // Real Wall-Clock Sync Timer
  useEffect(() => {
    refundCalledRef.current = false;

    // Helper to calculate exact remaining seconds from creation time
    const getWallClockRemaining = () => {
      const createdMs = activeCreatedAt ? new Date(activeCreatedAt).getTime() : Date.now();
      const expireMs = createdMs + 10 * 60 * 1000; // Fixed 10 minutes from creation
      const remainingSecs = Math.max(0, Math.floor((expireMs - Date.now()) / 1000));
      return remainingSecs;
    };

    const initialSecs = getWallClockRemaining();
    setTimeLeft(initialSecs);

    if (initialSecs <= 0) {
      setStatus("expired");
      triggerAutoRefund();
      return;
    } else {
      if (status !== "received") {
        setStatus("waiting");
      }
    }

    const timer = setInterval(() => {
      const secs = getWallClockRemaining();
      setTimeLeft(secs);

      if (secs <= 0) {
        clearInterval(timer);
        setStatus("expired");
        triggerAutoRefund();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCreatedAt, activeOrderId, status, triggerAutoRefund]);

  // Poll server for SMS arrival
  const checkSms = useCallback(async () => {
    if (status !== "waiting" || !activeOrderId) return;

    try {
      const res = await fetch(`/api/rentals/check-sms?orderId=${activeOrderId}`);
      const data = await res.json();

      if (data.sms_code) {
        setSmsCode(data.sms_code);
        if (data.full_sms) setFullMessage(data.full_sms);
        setStatus("received");

        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error polling SMS:", err);
    }
  }, [activeOrderId, status]);

  // Poll SMS interval
  useEffect(() => {
    if (status !== "waiting") return;

    const pollInterval = setInterval(() => {
      checkSms();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [status, checkSms]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = (timeLeft / 600) * 100;
  const safeCountryCode = (activeCountryCode || "US").toLowerCase();
  const safeOrderIdDisplay = activeOrderId ? activeOrderId.slice(0, 8) : "N/A";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#090e1a] border border-slate-800 w-full max-w-[92vw] sm:max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden text-white max-h-[90vh] overflow-y-auto">
        {/* Ambient Glow */}
        <div
          className={`absolute -top-24 -left-24 w-48 h-48 blur-[90px] rounded-full pointer-events-none ${
            status === "received" ? "bg-emerald-500/20" : "bg-cyan-500/15"
          }`}
        ></div>

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0d1526] border border-slate-700/80 flex items-center justify-center p-2 shrink-0">
              {!imgFailed ? (
                <img
                  src={activeOrder?.logo || `https://cdn.simpleicons.org/${getServiceSlug(activeServiceName)}/10B981`}
                  alt={activeServiceName}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span className="text-base">📱</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white truncate">{activeServiceName}</span>
                <img
                  src={`https://flagcdn.com/w40/${safeCountryCode}.png`}
                  alt={safeCountryCode}
                  className="w-4 h-3 rounded-sm object-cover shrink-0"
                />
              </div>
              <span className="text-[10px] text-gray-400 font-mono block truncate">Order #{safeOrderIdDisplay}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={props.onClose}
            className="w-8 h-8 rounded-full bg-[#152035] hover:bg-slate-800 text-gray-400 hover:text-white flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Phone Number Display Box */}
        <div className="bg-[#0d1526] border border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Temporary Line</span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-tight truncate">{activePhoneNumber}</span>
            <button
              type="button"
              onClick={handleCopyPhone}
              className="bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 text-xs px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer"
            >
              {copiedPhone ? "Copied! ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* SMS OTP Code Box */}
        <div className="bg-[#152035] border border-slate-700/80 rounded-xl sm:rounded-2xl p-5 sm:p-6 text-center space-y-3 min-h-[130px] flex flex-col items-center justify-center relative">
          {status === "waiting" && (
            <div className="space-y-3 py-1">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Waiting for incoming SMS...</span>
                <span className="text-[10px] sm:text-[11px] text-gray-400 block mt-0.5">Send verification code to {activePhoneNumber}</span>
              </div>
            </div>
          )}

          {status === "received" && (
            <div className="space-y-3 w-full animate-in zoom-in-95 duration-300">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block">Verification Code Received</span>
              <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest">{smsCode}</div>
              {fullMessage && (
                <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono bg-[#0d1526] p-2 rounded-xl text-left border border-slate-800 break-words">
                  {fullMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleCopyCode}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
              >
                {copiedCode ? "Code Copied to Clipboard! ✓" : "Copy Code"}
              </button>
            </div>
          )}

          {status === "expired" && (
            <div className="space-y-1">
              <span className="text-sm sm:text-base font-bold text-red-400">10-Minute Timeout Reached</span>
              <p className="text-xs text-emerald-400 font-bold">${activePriceUsd.toFixed(2)} refunded to your wallet balance.</p>
            </div>
          )}
        </div>

        {/* Timer Bar */}
        {status === "waiting" && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold text-gray-400">
              <span>Auto-Timeout (10 mins)</span>
              <span className="font-mono text-emerald-400">
                {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#152035] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={props.onClose}
            className="w-full bg-[#152035] hover:bg-slate-800 text-gray-200 border border-slate-700/80 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer"
          >
            {status === "received" ? "Close Modal" : "Dismiss (Line stays active in background)"}
          </button>
        </div>
      </div>
    </div>
  );
}