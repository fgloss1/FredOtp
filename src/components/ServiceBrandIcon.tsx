"use client";

import { useState } from "react";

const SERVICE_DOMAINS: Record<string, string> = {
  match: "match.com", zoosk: "zoosk.com", tinder: "tinder.com", bumble: "bumble.com", hinge: "hinge.co", badoo: "badoo.com",
  okcupid: "okcupid.com", plentyoffish: "pof.com", grindr: "grindr.com", her: "weareher.com", happn: "happn.com", coffeemeetsbagel: "coffeemeetsbagel.com",
  gmail: "gmail.com", outlook: "outlook.com", yahoo: "yahoo.com", protonmail: "proton.me", microsoft: "microsoft.com",
  paypal: "paypal.com", venmo: "venmo.com", cashapp: "cash.app", coinbase: "coinbase.com", binance: "binance.com", revolut: "revolut.com", chime: "chime.com", wise: "wise.com", stripe: "stripe.com",
  whatsapp: "whatsapp.com", telegram: "telegram.org", signal: "signal.org", discord: "discord.com", viber: "viber.com", line: "line.me", wechat: "wechat.com", skype: "skype.com", slack: "slack.com", messenger: "messenger.com",
  facebook: "facebook.com", instagram: "instagram.com", tiktok: "tiktok.com", twitter: "x.com", snapchat: "snapchat.com", linkedin: "linkedin.com", reddit: "reddit.com", pinterest: "pinterest.com", threads: "threads.net",
  uber: "uber.com", airbnb: "airbnb.com", doordash: "doordash.com", amazon: "amazon.com", ebay: "ebay.com", etsy: "etsy.com", walmart: "walmart.com", aliexpress: "aliexpress.com", temu: "temu.com",
  netflix: "netflix.com", spotify: "spotify.com", twitch: "twitch.tv", steam: "steampowered.com", roblox: "roblox.com", disneyplus: "disneyplus.com", hulu: "hulu.com",
  openai: "openai.com", chatgpt: "chatgpt.com", github: "github.com", gitlab: "gitlab.com", notion: "notion.so", canva: "canva.com", zoom: "zoom.us", dropbox: "dropbox.com", apple: "apple.com", adobe: "adobe.com", figma: "figma.com",
  booking: "booking.com", lyft: "lyft.com", bolt: "bolt.eu", deliveroo: "deliveroo.co.uk", glovo: "glovoapp.com",
  airalo: "airalo.com", proton: "proton.me", duckduckgo: "duckduckgo.com", brave: "brave.com", discordapp: "discord.com",
};

const SIMPLE_ICON_ALIASES: Record<string, string> = {
  "gmail-google": "google", google: "google", "g-mail": "google", outlook: "microsoftoutlook", microsoft: "microsoft",
  "cash-app": "cashapp", cashapp: "cashapp", twitter: "x", "x-twitter": "x", "openai-chatgpt": "openai", chatgpt: "openai",
  "facebook-messenger": "messenger", messenger: "messenger", "disney-plus": "disneyplus", disneyplus: "disneyplus",
  "coffee-meets-bagel": "coffeemeetsbagel", coffeemeetsbagel: "coffeemeetsbagel", plentyoffish: "plentyoffish",
};

const FALLBACKS: Record<string, string> = {
  match: "M", zoosk: "Z", tinder: "T", bumble: "B", hinge: "H", badoo: "B", okcupid: "O", plentyoffish: "P", grindr: "G", her: "H", happn: "H", coffeemeetsbagel: "C",
  gmail: "G", outlook: "O", yahoo: "Y", protonmail: "P", microsoft: "M", paypal: "P", venmo: "V", cashapp: "C", coinbase: "C", binance: "B", revolut: "R", chime: "C", wise: "W", stripe: "S",
  whatsapp: "W", telegram: "T", signal: "S", discord: "D", viber: "V", line: "L", wechat: "W", skype: "S", slack: "S", messenger: "M", facebook: "F", instagram: "I", tiktok: "T", twitter: "X", snapchat: "S", linkedin: "L", reddit: "R", pinterest: "P", threads: "T",
  uber: "U", airbnb: "A", doordash: "D", amazon: "A", ebay: "E", etsy: "E", walmart: "W", aliexpress: "A", temu: "T", netflix: "N", spotify: "S", twitch: "T", steam: "S", roblox: "R", disneyplus: "D", hulu: "H",
  openai: "O", chatgpt: "C", github: "G", gitlab: "G", notion: "N", canva: "C", zoom: "Z", dropbox: "D", apple: "A", adobe: "A", figma: "F", booking: "B", lyft: "L", bolt: "B", deliveroo: "D", glovo: "G", airalo: "A", brave: "B", duckduckgo: "D", other: "O",
};

type Props = { slug: string; name: string; size?: "sm" | "md" };

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function guessDomain(slug: string): string | null {
  const compact = normalizeKey(slug).replace(/-/g, "");
  if (!compact || compact === "other") return null;
  return `${compact}.com`;
}

export function ServiceBrandIcon({ slug, name, size = "md" }: Props) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const key = normalizeKey(slug);
  const domain = SERVICE_DOMAINS[key] ?? guessDomain(key);
  const simpleKey = SIMPLE_ICON_ALIASES[key] ?? key;
  const fallback = FALLBACKS[key] ?? (name.trim().charAt(0).toUpperCase() || "O");
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const image = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  const sources = [
    domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null,
    `https://cdn.simpleicons.org/${encodeURIComponent(simpleKey)}`,
  ].filter(Boolean) as string[];

  if (sourceIndex >= sources.length) {
    return (
      <span className={`grid ${box} shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-sm font-black text-emerald-300 ring-1 ring-white/10`} aria-hidden="true">
        {fallback}
      </span>
    );
  }

  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-xl bg-white p-1.5 ring-1 ring-white/10`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sources[sourceIndex]}
        alt={`${name} logo`}
        width={32}
        height={32}
        loading="lazy"
        className={`${image} object-contain`}
        onError={() => setSourceIndex((value) => value + 1)}
      />
    </span>
  );
}
