"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PriceItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  basePriceUSD: number;
  stock: number | string;
  successRate: number;
  logoUrl?: string;
  emojiFallback: string;
  iconBg: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
  dialCode: string;
  flagUrl: string;
  currencyCode: string;
  currencySymbol: string;
  exchangeRate: number;
  priceMultiplier: number;
}

export default function PriceListPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);

  // Sync theme
  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    };
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  // Countries
  const countries: Country[] = [
    { id: "1", name: "Nigeria", code: "ng", dialCode: "+234", flagUrl: "https://flagcdn.com/w40/ng.png", currencyCode: "NGN", currencySymbol: "₦", exchangeRate: 1500, priceMultiplier: 1.0 },
    { id: "2", name: "United States", code: "us", dialCode: "+1", flagUrl: "https://flagcdn.com/w40/us.png", currencyCode: "USD", currencySymbol: "$", exchangeRate: 1, priceMultiplier: 1.5 },
    { id: "3", name: "United Kingdom", code: "gb", dialCode: "+44", flagUrl: "https://flagcdn.com/w40/gb.png", currencyCode: "GBP", currencySymbol: "£", exchangeRate: 0.79, priceMultiplier: 1.4 },
    { id: "4", name: "Canada", code: "ca", dialCode: "+1", flagUrl: "https://flagcdn.com/w40/ca.png", currencyCode: "CAD", currencySymbol: "C$", exchangeRate: 1.37, priceMultiplier: 1.35 },
    { id: "5", name: "Ghana", code: "gh", dialCode: "+233", flagUrl: "https://flagcdn.com/w40/gh.png", currencyCode: "GHS", currencySymbol: "₵", exchangeRate: 14.5, priceMultiplier: 0.9 },
    { id: "6", name: "Kenya", code: "ke", dialCode: "+254", flagUrl: "https://flagcdn.com/w40/ke.png", currencyCode: "KES", currencySymbol: "KSh", exchangeRate: 129, priceMultiplier: 0.95 },
    { id: "7", name: "South Africa", code: "za", dialCode: "+27", flagUrl: "https://flagcdn.com/w40/za.png", currencyCode: "ZAR", currencySymbol: "R", exchangeRate: 18.6, priceMultiplier: 1.1 },
    { id: "8", name: "India", code: "in", dialCode: "+91", flagUrl: "https://flagcdn.com/w40/in.png", currencyCode: "INR", currencySymbol: "₹", exchangeRate: 83.5, priceMultiplier: 0.85 },
    { id: "9", name: "Germany", code: "de", dialCode: "+49", flagUrl: "https://flagcdn.com/w40/de.png", currencyCode: "EUR", currencySymbol: "€", exchangeRate: 0.92, priceMultiplier: 1.45 },
    { id: "10", name: "France", code: "fr", dialCode: "+33", flagUrl: "https://flagcdn.com/w40/fr.png", currencyCode: "EUR", currencySymbol: "€", exchangeRate: 0.92, priceMultiplier: 1.45 },
  ];

  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [imgErrors, setImgErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch)
  );

  const services: PriceItem[] = [
    { id: "1", name: "WhatsApp", slug: "whatsapp", logoUrl: "https://api.iconify.design/simple-icons:whatsapp.svg?color=%2325D366", iconBg: "#25D36620", category: "Messaging", basePriceUSD: 0.90, stock: 820, successRate: 98, emojiFallback: "💬" },
    { id: "2", name: "Telegram", slug: "telegram", logoUrl: "https://api.iconify.design/simple-icons:telegram.svg?color=%2326A5E4", iconBg: "#26A5E420", category: "Messaging", basePriceUSD: 0.75, stock: 412, successRate: 97, emojiFallback: "✈️" },
    { id: "3", name: "Signal", slug: "signal", logoUrl: "https://api.iconify.design/simple-icons:signal.svg?color=%233A76F0", iconBg: "#3A76F020", category: "Messaging", basePriceUSD: 0.85, stock: 190, successRate: 94, emojiFallback: "🔒" },
    { id: "4", name: "Facebook", slug: "facebook", logoUrl: "https://api.iconify.design/simple-icons:facebook.svg?color=%231877F2", iconBg: "#1877F220", category: "Social", basePriceUSD: 0.30, stock: 244, successRate: 90, emojiFallback: "📘" },
    { id: "5", name: "Instagram", slug: "instagram", logoUrl: "https://api.iconify.design/simple-icons:instagram.svg?color=%23E4405F", iconBg: "#E4405F20", category: "Social", basePriceUSD: 0.55, stock: 622, successRate: 93, emojiFallback: "📸" },
    { id: "6", name: "TikTok", slug: "tiktok", logoUrl: "https://api.iconify.design/simple-icons:tiktok.svg?color=%2300F2FE", iconBg: "#00F2FE20", category: "Social", basePriceUSD: 0.65, stock: 388, successRate: 92, emojiFallback: "🎵" },
    { id: "7", name: "X / Twitter", slug: "twitter", logoUrl: "https://api.iconify.design/simple-icons:x.svg?color=%23FFFFFF", iconBg: "#FFFFFF20", category: "Social", basePriceUSD: 0.40, stock: 502, successRate: 93, emojiFallback: "🐦" },
    { id: "8", name: "Discord", slug: "discord", logoUrl: "https://api.iconify.design/simple-icons:discord.svg?color=%235865F2", iconBg: "#5865F220", category: "Social", basePriceUSD: 0.25, stock: 64, successRate: 96, emojiFallback: "👾" },
    { id: "9", name: "Match.com", slug: "match", logoUrl: "https://api.iconify.design/mdi:heart.svg?color=%23E31C79", iconBg: "#E31C7920", category: "Dating", basePriceUSD: 0.85, stock: 142, successRate: 89, emojiFallback: "💘" },
    { id: "10", name: "POF.com", slug: "pof", logoUrl: "https://api.iconify.design/mdi:account-heart.svg?color=%23FF6600", iconBg: "#FF660020", category: "Dating", basePriceUSD: 0.70, stock: 168, successRate: 88, emojiFallback: "🧡" },
    { id: "11", name: "Tinder", slug: "tinder", logoUrl: "https://api.iconify.design/simple-icons:tinder.svg?color=%23FF6B6B", iconBg: "#FF6B6B20", category: "Dating", basePriceUSD: 0.65, stock: 388, successRate: 91, emojiFallback: "🔥" },
    { id: "12", name: "Bumble", slug: "bumble", logoUrl: "https://api.iconify.design/simple-icons:bumble.svg?color=%23F5C518", iconBg: "#F5C51820", category: "Dating", basePriceUSD: 0.80, stock: 378, successRate: 94, emojiFallback: "🐝" },
    { id: "13", name: "Gmail / Google", slug: "google", logoUrl: "https://api.iconify.design/simple-icons:google.svg?color=%234285F4", iconBg: "#4285F420", category: "Email", basePriceUSD: 0.40, stock: 177, successRate: 95, emojiFallback: "🔍" },
    { id: "14", name: "OpenAI / ChatGPT", slug: "openai", logoUrl: "https://api.iconify.design/simple-icons:openai.svg?color=%2310A37F", iconBg: "#10A37F20", category: "Tech", basePriceUSD: 1.50, stock: 133, successRate: 94, emojiFallback: "🤖" },
    { id: "15", name: "PayPal", slug: "paypal", logoUrl: "https://api.iconify.design/simple-icons:paypal.svg?color=%2300457C", iconBg: "#00457C20", category: "Finance", basePriceUSD: 1.10, stock: 210, successRate: 84, emojiFallback: "💳" },
    { id: "16", name: "Cash App", slug: "cashapp", logoUrl: "https://api.iconify.design/simple-icons:cashapp.svg?color=%2300C244", iconBg: "#00C24420", category: "Finance", basePriceUSD: 1.25, stock: 181, successRate: 82, emojiFallback: "💵" },
    { id: "17", name: "Amazon", slug: "amazon", logoUrl: "https://api.iconify.design/simple-icons:amazon.svg?color=%23FF9900", iconBg: "#FF990020", category: "Shopping", basePriceUSD: 0.40, stock: 665, successRate: 87, emojiFallback: "🛒" },
    { id: "18", name: "Netflix", slug: "netflix", logoUrl: "https://api.iconify.design/simple-icons:netflix.svg?color=%23E50914", iconBg: "#E5091420", category: "Entertainment", basePriceUSD: 0.85, stock: 55, successRate: 88, emojiFallback: "🎬" },
    { id: "19", name: "Uber", slug: "uber", logoUrl: "https://api.iconify.design/simple-icons:uber.svg?color=%23FFFFFF", iconBg: "#FFFFFF20", category: "Travel", basePriceUSD: 0.70, stock: 149, successRate: 90, emojiFallback: "🚗" },
    { id: "20", name: "Other / Any Site", slug: "other", logoUrl: "https://api.iconify.design/mdi:cellphone-message.svg?color=%2310B981", iconBg: "#10B98120", category: "Other", basePriceUSD: 0.50, stock: "Live", successRate: 80, emojiFallback: "📱" },
  ];

  const categories = ["All", "Dating", "Messaging", "Social", "Finance", "Shopping", "Email", "Entertainment", "Travel", "Tech", "Other"];

  const formatPrice = (baseUSD: number) => {
    const usd = baseUSD * selectedCountry.priceMultiplier;
    const local = usd * selectedCountry.exchangeRate;
    if (selectedCountry.currencyCode === "USD") return `$${usd.toFixed(2)}`;
    if (local >= 100) return `${selectedCountry.currencySymbol}${Math.round(local).toLocaleString()}`;
    return `${selectedCountry.currencySymbol}${local.toFixed(2)}`;
  };

  const filteredServices = services.filter((s) => {
    const matchesCat = activeCategory === "All" || s.category === activeCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800/80 shadow-md",
        cardMuted: "bg-[#0f172a]/60 border border-slate-800",
        innerCard: "bg-[#070d19] border border-slate-800/80",
        text: "text-white",
        textMuted: "text-gray-400",
        textSubtle: "text-gray-500",
        input: "bg-[#070c18] border border-slate-800 text-white placeholder-gray-500",
        pillActive: "bg-emerald-500 text-black font-bold shadow-sm",
        pillInactive: "bg-[#0f172a] text-gray-400 hover:text-white hover:bg-slate-800",
        dropdownBg: "bg-[#0d1527] border border-slate-800 shadow-2xl",
        dropdownHover: "hover:bg-emerald-500/10 hover:text-white",
        tableHeader: "bg-[#070d19] border-b border-slate-800 text-gray-400",
        tableRow: "hover:bg-[#0f172a]/50 border-b border-slate-800/50",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        cardMuted: "bg-white border-2 border-slate-300 shadow-sm",
        innerCard: "bg-slate-50 border-2 border-slate-200",
        text: "text-slate-900",
        textMuted: "text-slate-600 font-medium",
        textSubtle: "text-slate-500",
        input: "bg-white border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 font-semibold",
        pillActive: "bg-emerald-500 text-white font-bold shadow-sm",
        pillInactive: "bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-900 font-semibold",
        dropdownBg: "bg-white border-2 border-slate-300 shadow-2xl",
        dropdownHover: "hover:bg-slate-100",
        tableHeader: "bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold",
        tableRow: "hover:bg-slate-50 border-b border-slate-200",
      };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Master Price List</h1>
          <p className={`${theme.textMuted} text-xs mt-0.5`}>
            Compare live OTP rates, success rates, and availability across all countries.
          </p>
        </div>

        {/* View Toggle (Table / Grid) */}
        <div className={`flex items-center ${theme.cardMuted} rounded-xl p-1`}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "table" ? "bg-emerald-500 text-black shadow-sm" : theme.textMuted
            }`}
          >
            📋 Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "grid" ? "bg-emerald-500 text-black shadow-sm" : theme.textMuted
            }`}
          >
            🔲 Grid View
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`${theme.card} rounded-2xl p-4 space-y-3`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Country Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className={`block text-[10px] font-bold ${theme.textMuted} mb-1 uppercase tracking-wider`}>TARGET COUNTRY</label>
            <button
              type="button"
              onClick={() => {
                setIsCountryOpen(!isCountryOpen);
                setCountrySearch("");
              }}
              className={`w-full ${theme.input} rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors shadow-sm`}
            >
              <div className="flex items-center gap-2.5">
                <img src={selectedCountry.flagUrl} alt={selectedCountry.code} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                <span className="font-bold uppercase tracking-wider text-emerald-500">{selectedCountry.code}</span>
                <span>{selectedCountry.name} ({selectedCountry.dialCode})</span>
              </div>
              <span className="text-[10px] text-gray-400">{isCountryOpen ? "▲" : "▼"}</span>
            </button>

            {isCountryOpen && (
              <div className={`absolute top-full left-0 right-0 mt-2 ${theme.dropdownBg} rounded-2xl p-2 z-50 animate-fadeIn`}>
                <div className="p-1 mb-1">
                  <input
                    type="text"
                    autoFocus
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country name or code..."
                    className={`w-full ${theme.input} rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500`}
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                  {filteredCountries.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCountry(c);
                        setIsCountryOpen(false);
                      }}
                      className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all ${theme.dropdownHover} ${
                        selectedCountry.id === c.id ? "bg-emerald-500/15 font-bold text-emerald-500" : theme.text
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img src={c.flagUrl} alt={c.code} className="w-5 h-3.5 object-cover rounded-sm shadow-sm shrink-0" />
                        <span className="font-bold uppercase text-[11px] text-gray-400">{c.code}</span>
                        <span>{c.name}</span>
                        <span className="text-[10px] bg-slate-800/40 px-1.5 py-0.5 rounded text-gray-400">{c.dialCode}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-gray-400 bg-black/20 px-2 py-0.5 rounded-md">
                        {c.currencyCode} ({c.currencySymbol})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div>
            <label className={`block text-[10px] font-bold ${theme.textMuted} mb-1 uppercase tracking-wider`}>SEARCH SERVICE</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search WhatsApp, Telegram, Match.com..."
              className={`w-full ${theme.input} rounded-xl px-3.5 py-2.5 text-xs focus:outline-none`}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat ? theme.pillActive : theme.pillInactive
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" ? (
        <div className={`${theme.card} rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`${theme.tableHeader} uppercase text-[10px] tracking-wider`}>
                <tr>
                  <th className="px-5 py-3.5">Service</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price (USD)</th>
                  <th className="px-5 py-3.5">Price ({selectedCountry.currencyCode})</th>
                  <th className="px-5 py-3.5">Success Rate</th>
                  <th className="px-5 py-3.5">Stock Pool</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredServices.map((svc) => {
                  const usd = svc.basePriceUSD * selectedCountry.priceMultiplier;
                  const localPrice = formatPrice(svc.basePriceUSD);
                  const hasErr = imgErrors[svc.id];

                  return (
                    <tr key={svc.id} className={`${theme.tableRow} transition-colors`}>
                      <td className="px-5 py-3.5 font-bold flex items-center gap-3">
                        {/* Dark Slate Badge for 100% Logo Contrast */}
                        <div className="w-8 h-8 rounded-lg bg-[#0d1526] border border-slate-700/80 flex items-center justify-center shrink-0 p-1.5 shadow-sm">
                          {!hasErr && svc.logoUrl ? (
                            <img
                              src={svc.logoUrl}
                              alt={svc.name}
                              className="w-full h-full object-contain"
                              onError={() => setImgErrors((prev) => ({ ...prev, [svc.id]: true }))}
                            />
                          ) : (
                            <span>{svc.emojiFallback}</span>
                          )}
                        </div>
                        <span className={theme.text}>{svc.name}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${theme.cardMuted}`}>
                          {svc.category}
                        </span>
                      </td>

                      <td className={`px-5 py-3.5 font-bold ${theme.text}`}>
                        ${usd.toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 font-black text-emerald-500">
                        {localPrice}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-emerald-500 font-bold">{svc.successRate}%</span>
                      </td>

                      <td className={`px-5 py-3.5 ${theme.textMuted}`}>
                        {typeof svc.stock === "number" ? `${svc.stock} lines` : svc.stock}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => router.push("/dashboard")}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] px-3 py-1.5 rounded-lg transition-all shadow-sm"
                        >
                          Rent Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredServices.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-500">
                No services matching &quot;{searchTerm}&quot; in this category.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredServices.map((svc) => {
            const usd = svc.basePriceUSD * selectedCountry.priceMultiplier;
            const localPrice = formatPrice(svc.basePriceUSD);
            const hasErr = imgErrors[svc.id];

            return (
              <div key={svc.id} className={`${theme.card} rounded-2xl p-4 flex flex-col justify-between space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Dark Slate Badge for 100% Logo Contrast */}
                    <div className="w-10 h-10 rounded-xl bg-[#0d1526] border border-slate-700/80 flex items-center justify-center shrink-0 p-2 shadow-sm">
                      {!hasErr && svc.logoUrl ? (
                        <img
                          src={svc.logoUrl}
                          alt={svc.name}
                          className="w-full h-full object-contain"
                          onError={() => setImgErrors((prev) => ({ ...prev, [svc.id]: true }))}
                        />
                      ) : (
                        <span>{svc.emojiFallback}</span>
                      )}
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${theme.text}`}>{svc.name}</h4>
                      <p className={`text-[10px] ${theme.textSubtle}`}>{svc.category}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-3 border-t border-slate-800/40">
                  <div>
                    <p className="text-xs text-gray-400">${usd.toFixed(2)}</p>
                    <p className="text-base font-black text-emerald-500">{localPrice}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm"
                  >
                    Rent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}