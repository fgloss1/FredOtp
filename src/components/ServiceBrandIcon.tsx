"use client";

import { useState } from "react";

const SERVICE_DOMAINS: Record<string, string> = {
  match: "match.com",
  zoosk: "zoosk.com",
  tinder: "tinder.com",
  bumble: "bumble.com",
  hinge: "hinge.co",
  badoo: "badoo.com",
  okcupid: "okcupid.com",
  plentyoffish: "pof.com",
  grindr: "grindr.com",
  her: "weareher.com",
  happn: "happn.com",
  coffeemeetsbagel: "coffeemeetsbagel.com",
  gmail: "gmail.com",
  outlook: "outlook.com",
  yahoo: "yahoo.com",
  protonmail: "proton.me",
  microsoft: "microsoft.com",
  paypal: "paypal.com",
  venmo: "venmo.com",
  cashapp: "cash.app",
  coinbase: "coinbase.com",
  binance: "binance.com",
  revolut: "revolut.com",
  chime: "chime.com",
  wise: "wise.com",
  stripe: "stripe.com",
  whatsapp: "whatsapp.com",
  telegram: "telegram.org",
  signal: "signal.org",
  discord: "discord.com",
  viber: "viber.com",
  line: "line.me",
  wechat: "wechat.com",
  skype: "skype.com",
  slack: "slack.com",
  facebook: "facebook.com",
  instagram: "instagram.com",
  tiktok: "tiktok.com",
  twitter: "x.com",
  snapchat: "snapchat.com",
  linkedin: "linkedin.com",
  reddit: "reddit.com",
  uber: "uber.com",
  airbnb: "airbnb.com",
  doordash: "doordash.com",
  amazon: "amazon.com",
  ebay: "ebay.com",
  etsy: "etsy.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  twitch: "twitch.tv",
  steam: "steampowered.com",
  roblox: "roblox.com",
  openai: "openai.com",
  github: "github.com",
  gitlab: "gitlab.com",
  notion: "notion.so",
  canva: "canva.com",
  zoom: "zoom.us",
  dropbox: "dropbox.com",
  apple: "apple.com",
};

const FALLBACKS: Record<string, string> = {
  match: "M",
  zoosk: "Z",
  tinder: "T",
  bumble: "B",
  hinge: "H",
  badoo: "B",
  okcupid: "O",
  plentyoffish: "P",
  grindr: "G",
  her: "H",
  happn: "H",
  coffeemeetsbagel: "C",
  gmail: "G",
  outlook: "O",
  yahoo: "Y",
  protonmail: "P",
  microsoft: "M",
  paypal: "P",
  venmo: "V",
  cashapp: "C",
  coinbase: "C",
  binance: "B",
  revolut: "R",
  chime: "C",
  wise: "W",
  stripe: "S",
  whatsapp: "W",
  telegram: "T",
  signal: "S",
  discord: "D",
  viber: "V",
  line: "L",
  wechat: "W",
  skype: "S",
  slack: "S",
  facebook: "F",
  instagram: "I",
  tiktok: "T",
  twitter: "X",
  snapchat: "S",
  linkedin: "L",
  reddit: "R",
  uber: "U",
  airbnb: "A",
  doordash: "D",
  amazon: "A",
  ebay: "E",
  etsy: "E",
  netflix: "N",
  spotify: "S",
  twitch: "T",
  steam: "S",
  roblox: "R",
  openai: "O",
  github: "G",
  gitlab: "G",
  notion: "N",
  canva: "C",
  zoom: "Z",
  dropbox: "D",
  apple: "A",
  other: "O",
};

type Props = {
  slug: string;
  name: string;
  size?: "sm" | "md";
};

export function ServiceBrandIcon({
  slug,
  name,
  size = "md",
}: Props) {
  const [failed, setFailed] = useState(false);

  const key = slug.trim().toLowerCase();
  const domain = SERVICE_DOMAINS[key];
  const fallback = FALLBACKS[key] ?? "O";

  const box =
    size === "sm"
      ? "h-9 w-9"
      : "h-11 w-11";

  const image =
    size === "sm"
      ? "h-6 w-6"
      : "h-8 w-8";

  if (!domain || failed) {
    return (
      <span
        className={`grid ${box} shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-sm font-black text-emerald-300 ring-1 ring-white/10`}
        aria-hidden="true"
      >
        {fallback}
      </span>
    );
  }

  const src =
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}` +
    "&sz=128";

  return (
    <span
      className={`grid ${box} shrink-0 place-items-center rounded-xl bg-white p-1.5 ring-1 ring-white/10`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name} logo`}
        width={32}
        height={32}
        loading="lazy"
        className={`${image} object-contain`}
        onError={() => setFailed(true)}
      />
    </span>
  );
}