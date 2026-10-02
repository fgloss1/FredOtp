"use client";

import React, { useState, useEffect } from "react";

interface OtpOrder {
  id: string;
  phone_number: string;
  service_name: string;
  country_code: string;
  carrier_label: string;
  price_usd: number;
  status: string;
}

interface OtpDrawerProps {
  order: OtpOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OtpDrawer({ order, isOpen, onClose }: OtpDrawerProps) {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [smsCode, setSmsCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Waiting for SMS...");
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes in seconds

  // Poll server for SMS arrival every 3 seconds
  useEffect(() => {
    if (!isOpen || !order || status === "Code Received!") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/otp?orderId=${order.id}`);
        const data = await res.json();
        if (data.received && data.code) {
          setSmsCode(data.code);
          setStatus("Code Received!");
          clearInterval(pollInterval);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [isOpen, order, status]);

  if (!isOpen || !order) return null;

  const copyToClipboard = (text: string, type: "number" | "code") => {
    navigator.clipboard.writeText(text);
    if (type === "number") {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg bg-[#111827] text-white rounded-t-2xl sm:rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-[#1f2937]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
              {order.service_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg capitalize text-white">
                {order.service_name} Verification
              </h3>
              <p className="text-xs text-gray-400">{order.carrier_label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6">
          
          {/* Phone Number Card */}
          <div className="bg-[#1f2937] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-400 block font-semibold mb-1">
                Assigned Number
              </span>
              <span className="text-xl font-mono font-bold tracking-wide text-white">
                {order.phone_number}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(order.phone_number, "number")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                copiedNumber
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {copiedNumber ? "✓ Copied" : "Copy Number"}
            </button>
          </div>

          {/* SMS Code Box */}
          <div className="bg-[#0f172a] p-5 rounded-xl border border-blue-500/30 text-center space-y-3">
            <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold block">
              SMS OTP Code
            </span>

            {smsCode ? (
              <div className="space-y-3">
                <div className="text-4xl font-mono font-extrabold tracking-widest text-emerald-400 animate-pulse">
                  {smsCode}
                </div>
                <button
                  onClick={() => copyToClipboard(smsCode, "code")}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-900/40"
                >
                  {copiedCode ? "✓ Code Copied to Clipboard!" : "Copy SMS Code"}
                </button>
              </div>
            ) : (
              <div className="py-3 space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Waiting for incoming SMS...
                </div>
                <p className="text-xs text-gray-400">
                  Enter this phone number into {order.service_name}. The code will display here automatically.
                </p>
              </div>
            )}
          </div>

          {/* Timer & Refund Protection Guarantee */}
          <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-800/80 pt-4">
            <div className="flex items-center gap-2">
              <span>⏱ Time Remaining:</span>
              <span className="font-mono font-bold text-amber-400">
                {formatTime(timeLeft)}
              </span>
            </div>
            <span className="text-emerald-400 text-right">
              ✓ Auto-refund if no code arrives
            </span>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-[#1f2937]/30 border-t border-gray-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm transition"
          >
            Close & Continue in Background
          </button>
        </div>

      </div>
    </div>
  );
}