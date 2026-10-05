"use client";

import React from "react";
import { getServiceLogo } from "@/lib/otp-logos";

interface FeedItem {
  name: string;
  slug: string;
  code: string;
  message: string;
  time: string;
}

// Canonical slugs matching OFFICIAL_BRAND_SVGS keys in src/lib/otp-logos.ts
const ALERT_FEED_DATA: FeedItem[] = [
  {
    name: "WhatsApp",
    slug: "whatsapp",
    code: "928-104",
    message: "Your verification code is 928-104. Do not share it.",
    time: "Just now",
  },
  {
    name: "PayPal",
    slug: "paypal",
    code: "839201",
    message: "PayPal: 839201 is your security code. Never share it.",
    time: "25s ago",
  },
  {
    name: "Venmo",
    slug: "venmo", // Note: If venmo isn't in OFFICIAL_BRAND_SVGS, it will fallback nicely or use domain
    code: "492018",
    message: "Venmo: 492018 is your code. It expires in 5 mins.",
    time: "40s ago",
  },
  {
    name: "Bumble",
    slug: "bumble",
    code: "940182",
    message: "Your Bumble verification code is 940182.",
    time: "1m ago",
  },
  {
    name: "Binance",
    slug: "binance",
    code: "749201",
    message: "749201 is your Binance 2FA verification code.",
    time: "2m ago",
  },
  {
    name: "Google",
    slug: "google",
    code: "G-392041",
    message: "G-392041 is your Google verification code.",
    time: "2m ago",
  },
  {
    name: "Match",
    slug: "match", // Will fallback gracefully if not explicitly in SVGS, but matches domain
    code: "830219",
    message: "Match: Your login security code is 830219.",
    time: "3m ago",
  },
  {
    name: "Coinbase",
    slug: "coinbase",
    code: "593-012",
    message: "Coinbase: 593-012 is your 2-step verification code.",
    time: "4m ago",
  },
  {
    name: "Tinder",
    slug: "tinder",
    code: "482910",
    message: "Your Tinder code is 482910. Don't share.",
    time: "4m ago",
  },
  {
    name: "Telegram",
    slug: "telegram",
    code: "48291",
    message: "Telegram code: 48291. Do not give code to anyone.",
    time: "5m ago",
  },
  {
    name: "Zoosk",
    slug: "zoosk", // Fallback to domain
    code: "619402",
    message: "Your Zoosk verification code is 619402.",
    time: "6m ago",
  },
  {
    name: "Bitcoin",
    slug: "bitcoin",
    code: "BTC-104",
    message: "Bitcoin network verification. Do not share.",
    time: "6m ago",
  },
  {
    name: "OpenAI",
    slug: "openai",
    code: "593021",
    message: "Your OpenAI verification code is 593021.",
    time: "7m ago",
  },
  // AFTER:
{
  name: "Cash App",
  slug: "cash.app",
  code: "810-394",
  message: "Cash App: 810-394 is your sign-in code.",
  time: "8m ago",
},
  {
    name: "POF",
    slug: "pof",
    code: "382019",
    message: "POF code: 382019. Valid for 15 minutes.",
    time: "9m ago",
  },
  {
    name: "TikTok",
    slug: "tiktok",
    code: "839201",
    message: "[TikTok] 839201 is your verification code.",
    time: "10m ago",
  },
  {
    name: "Uber",
    slug: "uber",
    code: "7739",
    message: "Your Uber verification code is 7739. Never share it.",
    time: "11m ago",
  },
  {
    name: "Instagram",
    slug: "instagram",
    code: "302-918",
    message: "302-918 is your Instagram code. Don't share it.",
    time: "12m ago",
  },
  {
    name: "Facebook",
    slug: "facebook",
    code: "481092",
    message: "481092 is your Facebook confirmation code.",
    time: "13m ago",
  },
  {
    name: "Snapchat",
    slug: "snapchat",
    code: "819024",
    message: "Snapchat Code: 819024. Happy Snapping!",
    time: "14m ago",
  },
  {
    name: "Amazon",
    slug: "amazon",
    code: "194820",
    message: "194820 is your Amazon verification code.",
    time: "15m ago",
  },
  {
    name: "WeChat",
    slug: "wechat",
    code: "683912",
    message: "WeChat security code: 683912. Valid for 10 minutes.",
    time: "16m ago",
  },
  {
    name: "Steam",
    slug: "steam",
    code: "G8K29",
    message: "Steam Guard code: G8K29 for account login.",
    time: "17m ago",
  },
  {
    name: "Discord",
    slug: "discord",
    code: "920183",
    message: "Your Discord verification code is: 920183",
    time: "18m ago",
  },
  {
    name: "Microsoft",
    slug: "microsoft",
    code: "392019",
    message: "Use 392019 as Microsoft account security code.",
    time: "19m ago",
  },
  {
    name: "Netflix",
    slug: "netflix",
    code: "501928",
    message: "Your Netflix sign-in code is 501928.",
    time: "20m ago",
  },
];

export default function NotificationFeed() {
  const infiniteScrollItems = [...ALERT_FEED_DATA, ...ALERT_FEED_DATA];

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-black tracking-widest text-cyan-400 uppercase flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          Live Mobile Alert Feed
        </h2>
        </div>

      {/* Main Container Window */}
      <div className="relative w-full h-[480px] overflow-hidden rounded-3xl bg-[#090e1a] border border-slate-800/90 shadow-2xl">
        {/* Edge Fades */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#090e1a] to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#090e1a] to-transparent z-10 pointer-events-none" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes marqueeVertical {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          .animate-marquee-vertical {
            animation: marqueeVertical 75s linear infinite;
          }
          .animate-marquee-vertical:hover {
            animation-play-state: paused;
          }
        `,
          }}
        />

        {/* Scrolling List */}
        <div className="animate-marquee-vertical flex flex-col gap-3 p-4">
          {infiniteScrollItems.map((item, idx) => {
            // Use native NAVA logo engine exactly like Dashboard Catalog
            const logoUrl = getServiceLogo(item.name, item.slug);

            return (
              <div
                key={`${item.name}-${idx}`}
                className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-800/60 hover:border-slate-700"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* 3D WHITE / LIGHT-GREY TACTILE BOARD */}
                  <div
                    className="w-12 h-12 rounded-[15px] flex items-center justify-center shrink-0 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #f3f5f7 55%, #e6e9ee 100%)",
                      border: "1px solid rgba(255,255,255,0.95)",
                      boxShadow: `
                        0px 8px 16px rgba(0, 0, 0, 0.45),
                        0px 2px 4px rgba(0, 0, 0, 0.2),
                        inset 0px 1.5px 1px #ffffff,
                        inset 0px -2.5px 3px rgba(0, 0, 0, 0.15)
                      `,
                    }}
                  >
                    {/* Top Gloss Highlight */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

                    {/* Native Logo Rendering */}
                    <div className="relative z-10 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]">
                      <img
                        src={logoUrl}
                        alt={item.name}
                        width="28"
                        height="28"
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                        className="w-7 h-7 object-contain select-none pointer-events-none rounded-md"
                      />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-100">{item.name}</span>
                      <span className="text-[11px] font-mono font-black text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded-md">
                        {item.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px] sm:max-w-md leading-relaxed truncate">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] font-medium text-slate-500 font-mono shrink-0 hidden sm:block">
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}