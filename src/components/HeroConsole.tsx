"use client";

import React, { useState, useEffect } from "react";

interface MockService {
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  logo: string;
  price: string;
  phone: string;
  code: string;
  fullMessage: string;
}

const MOCK_SCENARIOS: MockService[] = [
  {
    name: "WhatsApp",
    country: "United States",
    countryCode: "us",
    flag: "https://flagcdn.com/w40/us.png",
    logo: "https://cdn.simpleicons.org/whatsapp/25D366",
    price: "$0.90",
    phone: "+1 (202) 555-0148",
    code: "928 - 104",
    fullMessage: "Your WhatsApp code is 928-104. Do not share it with anyone.",
  },
  {
    name: "OpenAI / ChatGPT",
    country: "United Kingdom",
    countryCode: "gb",
    flag: "https://flagcdn.com/w40/gb.png",
    logo: "https://cdn.simpleicons.org/openai/10A37F",
    price: "$1.50",
    phone: "+44 7700 900142",
    code: "614 - 902",
    fullMessage: "614902 is your OpenAI verification code.",
  },
  {
    name: "Telegram",
    country: "Canada",
    countryCode: "ca",
    flag: "https://flagcdn.com/w40/ca.png",
    logo: "https://cdn.simpleicons.org/telegram/26A5E4",
    price: "$0.85",
    phone: "+1 (416) 555-0199",
    code: "419 - 882",
    fullMessage: "Telegram code: 419882. You can also tap this link to log in.",
  },
  {
    name: "TikTok",
    country: "United States",
    countryCode: "us",
    flag: "https://flagcdn.com/w40/us.png",
    logo: "https://cdn.simpleicons.org/tiktok/25F4EE",
    price: "$0.65",
    phone: "+1 (305) 555-0812",
    code: "830 - 115",
    fullMessage: "[TikTok] 830115 is your verification code.",
  },
];

export default function HeroConsole() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"allocating" | "waiting" | "received">("allocating");
  const [codeDeliveredCount, setCodeDeliveredCount] = useState(14892);

  const scenario = MOCK_SCENARIOS[currentIndex];

  useEffect(() => {
    // Sequence timing loop per service:
    // 0s: Allocating -> 1.5s: Waiting -> 4.5s: Code Received -> 9.5s: Switch next
    const timer1 = setTimeout(() => {
      setPhase("waiting");
    }, 1500);

    const timer2 = setTimeout(() => {
      setPhase("received");
      setCodeDeliveredCount((prev) => prev + 1);
    }, 5000);

    const timer3 = setTimeout(() => {
      setPhase("allocating");
      setCurrentIndex((prev) => (prev + 1) % MOCK_SCENARIOS.length);
    }, 10000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [currentIndex]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Ambient Backdrop Glow */}
      <div
        className={`absolute -inset-1 rounded-3xl blur-2xl transition-all duration-1000 opacity-30 ${
          phase === "received" ? "bg-emerald-500" : "bg-cyan-500"
        }`}
      />

      {/* Main Console Box */}
      <div className="relative bg-[#090e1a] border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-white overflow-hidden">
        {/* Top Terminal Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] font-mono text-gray-400 ml-2">nava.console // live</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
              LIVE CARRIER FEED
            </span>
          </div>
        </div>

        {/* Selected Service Row */}
        <div className="bg-[#0d1526] border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#090e1a] border border-slate-700/80 p-2 flex items-center justify-center shrink-0">
              <img src={scenario.logo} alt={scenario.name} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{scenario.name}</span>
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-gray-300 font-semibold">
                  <img src={scenario.flag} alt={scenario.country} className="w-3 h-2 rounded-sm object-cover" />
                  {scenario.country}
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">Non-VoIP Mobile Line</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">{scenario.price}</span>
        </div>

        {/* Active Line Display */}
        <div className="bg-[#0d1526] border border-slate-800/80 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
            <span>ASSIGNED PHONE LINE</span>
            <span className={phase === "received" ? "text-emerald-400" : "text-amber-400"}>
              {phase === "allocating" && "ALLOCATING..."}
              {phase === "waiting" && "09:48 LEFT"}
              {phase === "received" && "SUCCESS ✓"}
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-tight">
            {phase === "allocating" ? (
              <span className="text-gray-500 animate-pulse">+1 (•••) •••-••••</span>
            ) : (
              scenario.phone
            )}
          </div>
        </div>

        {/* SMS OTP Display Box */}
        <div className="bg-[#152035] border border-slate-700/80 rounded-2xl p-5 text-center min-h-[120px] flex flex-col items-center justify-center relative overflow-hidden transition-all">
          {phase === "allocating" && (
            <div className="space-y-2 py-2">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <span className="text-xs font-bold text-gray-300 block">Connecting to US carrier route...</span>
            </div>
          )}

          {phase === "waiting" && (
            <div className="space-y-2 py-1 animate-in fade-in duration-300">
              <div className="relative w-8 h-8 mx-auto flex items-center justify-center">
                <span className="animate-ping absolute inset-0 rounded-full bg-cyan-400 opacity-20" />
                <span className="text-base">📡</span>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Waiting for incoming SMS...</span>
                <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                  Send verification code to {scenario.phone}
                </span>
              </div>
            </div>
          )}

          {phase === "received" && (
            <div className="space-y-2 w-full animate-in zoom-in-95 duration-300">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block">
                Verification Code Received
              </span>
              <div className="text-3xl font-mono font-black text-white tracking-widest text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                {scenario.code}
              </div>
              <p className="text-[10px] text-gray-300 font-mono bg-[#0d1526] p-2 rounded-xl border border-slate-800 truncate">
                {scenario.fullMessage}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Ticker Stats */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
          <div className="bg-[#0d1526] border border-slate-800/80 p-2 rounded-xl">
            <span className="text-[9px] text-gray-400 block uppercase font-bold">CARRIER ROUTE</span>
            <span className="text-xs font-bold text-emerald-400">100% Mobile</span>
          </div>
          <div className="bg-[#0d1526] border border-slate-800/80 p-2 rounded-xl">
            <span className="text-[9px] text-gray-400 block uppercase font-bold">CODES DELIVERED</span>
            <span className="text-xs font-bold text-white">{codeDeliveredCount.toLocaleString()}</span>
          </div>
          <div className="bg-[#0d1526] border border-slate-800/80 p-2 rounded-xl">
            <span className="text-[9px] text-gray-400 block uppercase font-bold">AVG SPEED</span>
            <span className="text-xs font-bold text-emerald-400">2.4 secs</span>
          </div>
        </div>
      </div>
    </div>
  );
}