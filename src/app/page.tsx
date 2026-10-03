"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import NotificationFeed from "@/components/NotificationFeed";
import HeroConsole from "@/components/HeroConsole";

const featuredServices = [
  { name: "WhatsApp", priceUsd: 0.9, stock: "820 left", color: "#25D366", logo: "https://api.iconify.design/simple-icons:whatsapp.svg?color=%2325D366", fallback: "💬", category: "Messaging" },
  { name: "Telegram", priceUsd: 0.75, stock: "412 left", color: "#26A5E4", logo: "https://api.iconify.design/simple-icons:telegram.svg?color=%2326A5E4", fallback: "✈️", category: "Messaging" },
  { name: "Gmail / Google", priceUsd: 0.4, stock: "177 left", color: "#4285F4", logo: "https://api.iconify.design/simple-icons:google.svg?color=%234285F4", fallback: "🔍", category: "Email" },
  { name: "Amazon", priceUsd: 0.4, stock: "665 left", color: "#FF9900", logo: "https://api.iconify.design/simple-icons:amazon.svg?color=%23FF9900", fallback: "🛒", category: "Shopping" },
  { name: "Instagram", priceUsd: 0.55, stock: "622 left", color: "#E4405F", logo: "https://api.iconify.design/simple-icons:instagram.svg?color=%23E4405F", fallback: "📸", category: "Social" },
  { name: "Discord", priceUsd: 0.25, stock: "64 left", color: "#5865F2", logo: "https://api.iconify.design/simple-icons:discord.svg?color=%235865F2", fallback: "👾", category: "Social" },
  { name: "Cash App", priceUsd: 1.25, stock: "181 left", color: "#00C244", logo: "https://api.iconify.design/simple-icons:cashapp.svg?color=%2300C244", fallback: "💵", category: "Finance" },
  { name: "TikTok", priceUsd: 0.65, stock: "388 left", color: "#00F2FE", logo: "https://api.iconify.design/simple-icons:tiktok.svg?color=%2300F2FE", fallback: "🎵", category: "Social" },
  { name: "Netflix", priceUsd: 0.85, stock: "55 left", color: "#E50914", logo: "https://api.iconify.design/simple-icons:netflix.svg?color=%23E50914", fallback: "🎬", category: "Entertainment" },
  { name: "Facebook", priceUsd: 0.3, stock: "244 left", color: "#1877F2", logo: "https://api.iconify.design/simple-icons:facebook.svg?color=%231877F2", fallback: "📘", category: "Social" },
  { name: "OpenAI / ChatGPT", priceUsd: 1.5, stock: "133 left", color: "#10A37F", logo: "https://api.iconify.design/simple-icons:openai.svg?color=%2310A37F", fallback: "🤖", category: "Tech" },
  { name: "Tinder", priceUsd: 0.65, stock: "388 left", color: "#FF6B6B", logo: "https://api.iconify.design/simple-icons:tinder.svg?color=%23FF6B6B", fallback: "🔥", category: "Dating" },
];

const countries = [
  { name: "Nigeria", code: "NG", dial: "+234", flag: "https://flagcdn.com/w40/ng.png" },
  { name: "United States", code: "US", dial: "+1", flag: "https://flagcdn.com/w40/us.png" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "https://flagcdn.com/w40/gb.png" },
  { name: "Canada", code: "CA", dial: "+1", flag: "https://flagcdn.com/w40/ca.png" },
  { name: "Ghana", code: "GH", dial: "+233", flag: "https://flagcdn.com/w40/gh.png" },
  { name: "Kenya", code: "KE", dial: "+254", flag: "https://flagcdn.com/w40/ke.png" },
  { name: "India", code: "IN", dial: "+91", flag: "https://flagcdn.com/w40/in.png" },
  { name: "Germany", code: "DE", dial: "+49", flag: "https://flagcdn.com/w40/de.png" },
];

const paymentMethods = [
  { name: "Paystack (NGN)", label: "Bank Transfer & Cards", icon: "https://flagcdn.com/w40/ng.png" },
  { name: "USDT (TRX)", label: "Tron Network", icon: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=025" },
  { name: "Bitcoin (BTC)", label: "Bitcoin Network", icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=025" },
  { name: "Litecoin (LTC)", label: "Litecoin Network", icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=025" },
];

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "NGN">("USD");
  const [imgErrors, setImgErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const savedTheme = localStorage.getItem("nava-theme");
    setDarkMode(savedTheme !== "light");

    const savedCurrency = localStorage.getItem("nava-currency");
    if (savedCurrency === "NGN" || savedCurrency === "USD") setCurrency(savedCurrency);

    const checkTheme = () => {
      const t = localStorage.getItem("nava-theme");
      setDarkMode(t !== "light");
    };

    window.addEventListener("nava-theme-change", checkTheme);

    import("@/lib/supabase")
      .then(({ supabase }) =>
        supabase.auth.getUser().then(({ data }) => {
          setLoggedIn(!!data?.user);
        })
      )
      .catch(() => setLoggedIn(false));

    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  const toggleCurrency = () => {
    const next = currency === "USD" ? "NGN" : "USD";
    setCurrency(next);
    localStorage.setItem("nava-currency", next);
    window.dispatchEvent(new Event("nava-currency-change"));
  };

  const rate = 1500;
  const formatPrice = (usd: number) => {
    if (currency === "NGN") return `₦${Math.round(usd * rate).toLocaleString()}`;
    return `$${usd.toFixed(2)}`;
  };

  const theme = darkMode
    ? {
        bg: "bg-[#070b14]",
        text: "text-white",
        textMuted: "text-gray-400 font-normal",
        textSubtle: "text-gray-500 font-normal",
        card: "bg-[#0b1120] border-slate-800",
        cardInner: "bg-[#070d19] border-slate-800",
        navBg: "bg-[#090e1a]/90 border-slate-800/80",
        navText: "text-gray-300",
        section: "border-slate-900",
        sectionMuted: "bg-[#090e1a]/40",
        heroBadge: "bg-emerald-950/50 border-emerald-800 text-emerald-400",
        secondary: "bg-slate-900 hover:bg-slate-800 border-slate-700 text-white",
        chip: "bg-slate-900 border-slate-800 text-gray-400",
        previewCodeBox: "bg-emerald-950/60 border-emerald-800/80",
        previewCodeText: "text-emerald-400 font-extrabold",
        previewDigits: "text-emerald-300",
      }
    : {
        bg: "bg-slate-50",
        text: "text-slate-900",
        textMuted: "text-slate-600 font-semibold",
        textSubtle: "text-slate-500 font-semibold",
        card: "bg-white border-slate-200 shadow-sm",
        cardInner: "bg-slate-50 border-slate-200",
        navBg: "bg-white/90 border-slate-200",
        navText: "text-slate-700 font-semibold",
        section: "border-slate-200",
        sectionMuted: "bg-slate-100/60",
        heroBadge: "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold",
        secondary: "bg-white hover:bg-slate-100 border-slate-300 text-slate-900 font-bold",
        chip: "bg-slate-100 border-slate-200 text-slate-700 font-bold",
        previewCodeBox: "bg-emerald-50 border border-emerald-300/80 shadow-inner",
        previewCodeText: "text-emerald-800 font-black",
        previewDigits: "text-emerald-700",
      };

  const renderLogo = (svc: (typeof featuredServices)[number], size = "w-6 h-6") => {
    const hasError = imgErrors[svc.name];
    return (
      <div
        className={`rounded-xl flex items-center justify-center text-xl shrink-0 ${size === "w-6 h-6" ? "w-11 h-11" : "w-9 h-9"}`}
        style={{ backgroundColor: `${svc.color}22` }}
      >
        {!hasError ? (
          <img
            src={svc.logo}
            alt={svc.name}
            className={size + " object-contain"}
            onError={() => setImgErrors((prev) => ({ ...prev, [svc.name]: true }))}
          />
        ) : (
          <span>{svc.fallback}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} selection:bg-emerald-500 selection:text-black transition-colors`}>
      {/* NAVBAR */}
      <header className={`border-b ${theme.navBg} backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500 text-black font-black flex items-center justify-center text-lg shadow-md">N</span>
            <span className="text-xl font-black tracking-wider text-emerald-500">NAVA</span>
          </Link>

          <div className={`hidden md:flex items-center gap-6 text-sm ${theme.navText} font-medium`}>
            <a href="#services" className="hover:text-emerald-500 transition-colors">
              Services
            </a>
            <a href="#countries" className="hover:text-emerald-500 transition-colors">
              Countries
            </a>
            <a href="#how" className="hover:text-emerald-500 transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-emerald-500 transition-colors">
              Pricing
            </a>
            <a href="#payments" className="hover:text-emerald-500 transition-colors">
              Payments
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleCurrency}
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                darkMode ? "bg-slate-900 border-slate-700 text-gray-300" : "bg-white border-slate-300 text-slate-800 shadow-sm"
              }`}
            >
              {currency === "USD" ? "🇺🇸 USD" : "🇳🇬 NGN"}
            </button>

            <ThemeToggle />

            {loggedIn ? (
              <Link
                href="/dashboard"
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-lg text-sm transition-all shadow"
              >
                Open Console →
              </Link>
            ) : (
              <>
                <Link href="/login" className={`text-sm font-bold ${theme.navText} hover:text-emerald-500 px-2 sm:px-3 py-2 transition-colors hidden sm:inline`}>
                  Sign In
                </Link>
                <Link href="/signup" className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-lg text-sm transition-all shadow">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Changed items-center to items-start here for top alignment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${theme.heroBadge} border text-xs font-bold mb-5`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live OTP marketplace • 20+ services • 16 countries
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                Rent numbers.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                  Receive OTP instantly.
                </span>
              </h1>

              <p className={`mt-5 text-base sm:text-lg ${theme.textMuted} max-w-xl leading-relaxed`}>
                NAVA is a B2C marketplace for real mobile verification numbers, 30-day T-Mobile eSIMs, and instant SMS
                delivery — funded by Paystack Naira or crypto (USDT TRX, BTC, LTC).
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={loggedIn ? "/dashboard" : "/signup"}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-7 py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all text-center"
                >
                  {loggedIn ? "Go to Dashboard" : "Start Renting Free"}
                </Link>
                <a
                  href="#services"
                  className={`${theme.secondary} border px-7 py-3.5 rounded-xl text-sm transition-all text-center`}
                >
                  Browse Services
                </a>
              </div>

              <div className={`mt-8 flex flex-wrap gap-6 text-xs ${theme.textMuted}`}>
                <div>
                  <p className={`${theme.text} font-black text-lg`}>20+</p>
                  <p>OTP services</p>
                </div>
                <div>
                  <p className={`${theme.text} font-black text-lg`}>16</p>
                  <p>countries</p>
                </div>
                <div>
                  <p className={`${theme.text} font-black text-lg`}>10 min</p>
                  <p>hold window</p>
                </div>
                <div>
                  <p className="text-emerald-500 font-black text-lg">Auto-refund</p>
                  <p>if SMS fails</p>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Elevator Alert Feed & Live Console */}
            <div className="space-y-6">
              <NotificationFeed />
              <HeroConsole />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES MARKETPLACE */}
      <section id="services" className={`py-16 border-t ${theme.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black">Popular OTP Services</h2>
              <p className={`${theme.textMuted} text-sm mt-2`}>
                Choose a service, rent a disposable number, and receive verification codes in seconds.
              </p>
            </div>
            <Link
              href={loggedIn ? "/dashboard" : "/signup"}
              className="text-sm text-emerald-500 hover:text-emerald-400 font-bold"
            >
              Open full catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {featuredServices.map((svc) => (
              <div
                key={svc.name}
                className={`${theme.card} border hover:border-emerald-500/50 rounded-2xl p-4 transition-all group`}
              >
                <div className="flex items-center justify-between mb-4">
                  {renderLogo(svc, "w-6 h-6")}
                  <span className={`text-[10px] px-2 py-1 rounded-md ${theme.chip} border`}>{svc.category}</span>
                </div>

                <h3 className={`font-bold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}>{svc.name}</h3>
                <p className={`text-[11px] ${theme.textSubtle} mt-1`}>{svc.stock}</p>

                <div className={`flex items-center justify-between mt-5 pt-4 border-t ${theme.section}`}>
                  <span className="text-emerald-500 font-black text-base">{formatPrice(svc.priceUsd)}</span>
                  <Link
                    href={loggedIn ? "/dashboard" : "/signup"}
                    className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black px-3 py-1.5 rounded-lg transition-all"
                  >
                    Rent
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COUNTRIES */}
      <section id="countries" className={`py-16 border-t ${theme.section} ${theme.sectionMuted}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-black">Numbers from 16 countries</h2>
            <p className={`${theme.textMuted} text-sm mt-2`}>
              Switch country in the console. Prices show in USD or NGN (baseline 1 USD = ₦1,500).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {countries.map((c) => (
              <div
                key={c.code}
                className={`${theme.card} border rounded-2xl p-4 text-center hover:border-emerald-500/40 transition-all`}
              >
                <img src={c.flag} alt={c.name} className="w-8 h-5 object-cover rounded-sm mx-auto shadow-sm" />
                <p className={`text-xs font-bold mt-3 ${darkMode ? "text-white" : "text-slate-900"}`}>{c.code}</p>
                <p className={`text-[10px] ${theme.textSubtle} mt-1`}>{c.dial}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className={`py-16 border-t ${theme.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black">How NAVA works</h2>
            <p className={`${theme.textMuted} text-sm mt-2`}>Three steps from signup to OTP delivery.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className={`${theme.card} border rounded-2xl p-6`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center mb-4">1</div>
              <h3 className={`font-bold text-lg mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>Top up wallet</h3>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                Fund once with Paystack (NGN bank transfer / cards) or crypto (USDT TRX, BTC, LTC). Every rental is charged from the same wallet.
              </p>
            </div>
            <div className={`${theme.card} border rounded-2xl p-6`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center mb-4">2</div>
              <h3 className={`font-bold text-lg mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>Choose service + country</h3>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                Pick WhatsApp, Telegram, ChatGPT, Google, TikTok, and more. Quick Code, 4-hour Web Line, or 30-day T-Mobile USA eSIM.
              </p>
            </div>
            <div className={`${theme.card} border rounded-2xl p-6`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center mb-4">3</div>
              <h3 className={`font-bold text-lg mb-2 ${darkMode ? "text-white" : "text-slate-900"}`}>Receive OTP automatically</h3>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                Your number appears instantly. Codes land in the live monitor. If no SMS in 10 minutes, auto-refund applies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENTS */}
      <section id="payments" className={`py-16 border-t ${theme.section} ${theme.sectionMuted}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-black">Accepted payments</h2>
            <p className={`${theme.textMuted} text-sm mt-2`}>
              Instant Naira via Paystack. Zero-fee crypto deposits with on-chain verification.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {paymentMethods.map((p) => (
              <div key={p.name} className={`${theme.card} border rounded-2xl p-4 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-xl bg-[#0d1526] border border-slate-700/80 flex items-center justify-center p-2 shrink-0">
                  <img src={p.icon} alt={p.name} className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${darkMode ? "text-white" : "text-slate-900"}`}>{p.name}</p>
                  <p className={`text-[11px] ${theme.textSubtle}`}>{p.label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className={`text-center text-xs ${theme.textSubtle} mt-6`}>
            Baseline rate 1 USD = ₦1,500 · Crypto auto-verified on-chain · Paystack instant NGN
          </p>
        </div>
      </section>

      {/* PRICING STRIP */}
      <section id="pricing" className={`py-16 border-t ${theme.section}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-black mb-4">One platform for OTP, eSIM & wallet</h2>
              <p className={`${theme.textMuted} text-sm leading-relaxed mb-6`}>
                NAVA combines disposable verification numbers, 30-day T-Mobile USA eSIMs, wallet billing, and a
                white-labeled console — without exposing suppliers.
              </p>

              <ul className="space-y-3 text-sm">
                {[
                  "Disposable OTP numbers with auto-refund",
                  "4-hour multi-SMS web lines",
                  "30-day T-Mobile USA eSIM (QR activation)",
                  "Paystack NGN + USDT TRX / BTC / LTC",
                  "Wallet top-ups and usage history",
                  "Dark / light console theme",
                ].map((item) => (
                  <li key={item} className={`flex items-center gap-3 ${theme.text}`}>
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${theme.card} border rounded-2xl p-6`}>
              <p className={`text-xs font-bold tracking-wider ${theme.textMuted} uppercase mb-2`}>Starting from</p>
              <p className="text-5xl font-black text-emerald-500">{formatPrice(0.25)}</p>
              <p className={`text-sm ${theme.textMuted} mt-2 mb-6`}>per verification code on selected services</p>

              <div className={`space-y-3 text-sm border-t ${theme.section} pt-5`}>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>Discord OTP</span>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{formatPrice(0.25)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>Gmail / Google</span>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{formatPrice(0.4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>WhatsApp</span>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{formatPrice(0.9)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={theme.textMuted}>T-Mobile 30-day eSIM</span>
                  <span className={`font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>{formatPrice(30)}</span>
                </div>
              </div>

              <Link
                href={loggedIn ? "/dashboard" : "/signup"}
                className="mt-6 w-full inline-flex justify-center bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl text-sm transition-all shadow"
              >
                {loggedIn ? "Open Dashboard" : "Create free account"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={`py-16 border-t ${theme.section} ${theme.sectionMuted}`}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to rent your first number?</h2>
          <p className={`${theme.textMuted} text-sm mb-8`}>
            Create an account, top up your wallet, and start receiving OTPs in under a minute.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={loggedIn ? "/dashboard" : "/signup"}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 py-3.5 rounded-xl text-sm shadow"
            >
              {loggedIn ? "Go to Console" : "Get Started Free"}
            </Link>
            <Link href="/login" className={`${theme.secondary} border font-bold px-8 py-3.5 rounded-xl text-sm`}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* OFFICIAL FOOTER COMPONENT */}
      <Footer />
    </div>
  );
}