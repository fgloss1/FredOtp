"use client";

import React from "react";

interface FeedItem {
  name: string;
  logo: string;
  code: string;
  message: string;
  time: string;
}

const ALERT_FEED_DATA: FeedItem[] = [
  {
    name: "WhatsApp",
    logo: "https://cdn.simpleicons.org/whatsapp/25D366",
    code: "928-104",
    message: "Your verification code is 928-104. Do not share it.",
    time: "Just now",
  },
  {
    name: "Facebook",
    logo: "https://cdn.simpleicons.org/facebook/1877F2",
    code: "481092",
    message: "481092 is your Facebook confirmation code.",
    time: "1m ago",
  },
  {
    name: "Uber",
    logo: "https://cdn.simpleicons.org/uber/000000", // FIXED: Crisp black vector logo on light clay tile
    code: "7739",
    message: "Your Uber verification code is 7739. Never share it.",
    time: "2m ago",
  },
  {
    name: "Steam",
    logo: "https://cdn.simpleicons.org/steam/000000",
    code: "G8K29",
    message: "Steam Guard code: G8K29 for account login.",
    time: "4m ago",
  },
  {
    name: "WeChat",
    logo: "https://cdn.simpleicons.org/wechat/07C160",
    code: "683912",
    message: "WeChat security code: 683912. Valid for 10 minutes.",
    time: "6m ago",
  },
  {
    name: "Google",
    logo: "https://api.iconify.design/logos:google-icon.svg", // FIXED: Official multi-color 4-brand Google 'G'
    code: "G-392041", // FIXED: Matches prefix in the message
    message: "G-392041 is your Google verification code.",
    time: "8m ago",
  },
];

export default function NotificationFeed() {
  const infiniteScrollItems = [...ALERT_FEED_DATA, ...ALERT_FEED_DATA];

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 1. CLEAN FIXED HEADER */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-black tracking-widest text-cyan-400 uppercase flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          Live Mobile Alert Feed
        </h2>
        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700/50">
          3D Tactile Engine
        </span>
      </div>

      {/* Main Container Window */}
      <div className="relative w-full h-[480px] overflow-hidden rounded-3xl bg-[#090e1a] border border-slate-800/90 shadow-2xl">
        {/* Fading Edge Effects */}
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
            animation: marqueeVertical 22s linear infinite;
          }
          .animate-marquee-vertical:hover {
            animation-play-state: paused;
          }
        `,
          }}
        />

        {/* Moving Feed Scroller */}
        <div className="animate-marquee-vertical flex flex-col gap-3 p-4">
          {infiniteScrollItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0f172a] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-800/60 hover:border-slate-700"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* 2. 3D MATTE CLAY CONTAINER TILE */}
                <div
                  className="w-12 h-12 flex items-center justify-center shrink-0 p-2.5 relative z-0"
                  style={{
                    backgroundColor: "#f1f3f5",
                    borderRadius: "14px",
                    boxShadow: `
                      0px 6px 12px rgba(0, 0, 0, 0.4),
                      inset 0px 2px 2px #ffffff,
                      inset 0px -3px 3px rgba(0, 0, 0, 0.15)
                    `,
                  }}
                >
                  {/* Fixed Logo Image Processing Layer */}
                  <img
                    src={item.logo}
                    alt={item.name}
                    className="w-7 h-7 object-contain relative z-10"
                    style={{
                      filter: `
                        drop-shadow(0px 3px 0.5px rgba(0, 0, 0, 0.25))
                        drop-shadow(0px 5px 6px rgba(0, 0, 0, 0.2))
                      `,
                    }}
                  />
                </div>

                {/* 3. CARD TYPOGRAPHY AND LAYOUT */}
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

              {/* Timestamp Alert Display */}
              <span className="text-[10px] font-medium text-slate-500 font-mono shrink-0 hidden sm:block">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}