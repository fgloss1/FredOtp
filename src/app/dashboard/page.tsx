"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import OtpModal from "@/components/OtpModal";
import OtpCatalog from "@/components/OtpCatalog";

const CURRENCIES: Record<string, { symbol: string; rate: number; name: string }> = {
  USD: { symbol: "$", rate: 1.0, name: "US Dollar" },
  NGN: { symbol: "₦", rate: 1500.0, name: "Nigerian Naira" },
  GBP: { symbol: "£", rate: 0.79, name: "British Pound" },
  EUR: { symbol: "€", rate: 0.92, name: "Euro" },
  GHS: { symbol: "₵", rate: 15.5, name: "Ghanaian Cedi" },
  KES: { symbol: "KSh ", rate: 129.0, name: "Kenyan Shilling" },
  ZAR: { symbol: "R ", rate: 18.2, name: "South African Rand" },
  CAD: { symbol: "CA$", rate: 1.38, name: "Canadian Dollar" },
};

const COUNTRIES = [
  { code: "us", name: "United States", dial: "+1", flag: "https://flagcdn.com/w40/us.png" },
  { code: "ng", name: "Nigeria", dial: "+234", flag: "https://flagcdn.com/w40/ng.png" },
  { code: "gb", name: "United Kingdom", dial: "+44", flag: "https://flagcdn.com/w40/gb.png" },
  { code: "ca", name: "Canada", dial: "+1", flag: "https://flagcdn.com/w40/ca.png" },
  { code: "gh", name: "Ghana", dial: "+233", flag: "https://flagcdn.com/w40/gh.png" },
  { code: "ke", name: "Kenya", dial: "+254", flag: "https://flagcdn.com/w40/ke.png" },
  { code: "za", name: "South Africa", dial: "+27", flag: "https://flagcdn.com/w40/za.png" },
];

const INITIAL_SERVICES = [
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", defaultCost: 0.85, logo: "https://cdn.simpleicons.org/whatsapp/25D366" },
  { id: "telegram", name: "Telegram", category: "Messaging", defaultCost: 0.80, logo: "https://cdn.simpleicons.org/telegram/26A5E4" },
  { id: "signal", name: "Signal", category: "Messaging", defaultCost: 0.80, logo: "https://cdn.simpleicons.org/signal/3A76F0" },
  { id: "instagram", name: "Instagram", category: "Social", defaultCost: 0.50, logo: "https://cdn.simpleicons.org/instagram/E4405F" },
  { id: "tiktok", name: "TikTok", category: "Social", defaultCost: 0.60, logo: "https://cdn.simpleicons.org/tiktok/25F4EE" },
  { id: "tinder", name: "Tinder", category: "Dating", defaultCost: 0.60, logo: "https://cdn.simpleicons.org/tinder/FF6B6B" },
  { id: "google", name: "Gmail / Google", category: "General", defaultCost: 0.35, logo: "https://cdn.simpleicons.org/gmail/EA4335" },
  { id: "openai", name: "OpenAI / ChatGPT", category: "AI", defaultCost: 1.20, logo: "https://cdn.simpleicons.org/openai/10A37F" },
  { id: "paypal", name: "PayPal", category: "Finance", defaultCost: 1.00, logo: "https://cdn.simpleicons.org/paypal/00457C" },
  { id: "facebook", name: "Facebook", category: "Social", defaultCost: 0.45, logo: "https://cdn.simpleicons.org/facebook/0866FF" },
  { id: "twitter", name: "X / Twitter", category: "Social", defaultCost: 0.55, logo: "https://cdn.simpleicons.org/x/FFFFFF" },
  { id: "uber", name: "Uber", category: "General", defaultCost: 0.60, logo: "https://cdn.simpleicons.org/uber/FFFFFF" },
];

const HOLD_MS = 10 * 60 * 1000;

function isWaitingStatus(status: string) {
  const s = (status || "").toLowerCase();
  return s.includes("waiting") || s === "pending";
}

function isWithinHoldWindow(createdAtIso: string) {
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < HOLD_MS;
}

export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [userBalance, setUserBalance] = useState<number>(0.0);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  const [activeModalOrder, setActiveModalOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenting, setIsRenting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    }
  }, []);

  // Fetch live server pricing for selected country & service
  const fetchLivePricing = useCallback(async (countryCode: string) => {
    setIsLoadingPrices(true);
    try {
      const updatedServices = await Promise.all(
        INITIAL_SERVICES.map(async (srv) => {
          try {
            const res = await fetch(`/api/5sim/prices?country=${countryCode}&service=${srv.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.pricing?.navaPricing) {
                return {
                  ...srv,
                  priceUSD: data.pricing.navaPricing.retailPriceUSD,
                  supplierCostUSD: data.pricing.lowestCost,
                  isAvailable: data.pricing.navaPricing.isViable,
                  availableCount: data.pricing.prices?.reduce((a: number, p: any) => a + (p.available || 0), 0) || 100,
                  marginUSD: data.pricing.navaPricing.marginUSD,
                };
              }
            }
          } catch (e) {
            console.warn(`Price fetch failed for ${srv.id}:`, e);
          }

          // Fallback pricing calculation
          const fallbackCost = srv.defaultCost;
          const markup = fallbackCost <= 0.5 ? 0.70 : fallbackCost <= 1.0 ? 0.50 : 0.40;
          const raw = Math.max(fallbackCost * (1 + markup), 0.50);
          const retail = Math.ceil(Math.round(raw * 100) / 5) * 0.05;

          return {
            ...srv,
            priceUSD: Number(retail.toFixed(2)),
            supplierCostUSD: fallbackCost,
            isAvailable: true,
            availableCount: 50,
          };
        })
      );

      setServices(updatedServices);
      setSelectedService(updatedServices[0]);
    } catch (e) {
      console.error("Failed to load live prices:", e);
    } finally {
      setIsLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePricing(selectedCountry.code);
  }, [selectedCountry, fetchLivePricing]);

  const mapOrder = useCallback((ord: any) => {
    const name = String(ord.service_name || "");
    const matchedService = INITIAL_SERVICES.find(
      (s) =>
        s.id === ord.service_name ||
        s.name.toLowerCase() === name.toLowerCase() ||
        name.toLowerCase().includes(s.id)
    );
    const matchedCountry =
      COUNTRIES.find((c) => c.code.toLowerCase() === String(ord.country_code || "").toLowerCase()) ||
      COUNTRIES[0];

    return {
      id: ord.id,
      service_name: matchedService ? matchedService.name : ord.service_name,
      phone_number: ord.phone_number,
      country_name: matchedCountry.name,
      country_code: ord.country_code,
      status: ord.status || "Waiting for SMS...",
      price_usd: ord.price_usd,
      created_at: ord.created_at,
      created_label: ord.created_at
        ? new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Just now",
      logo: matchedService ? matchedService.logo : "https://cdn.simpleicons.org/googlechrome/4285F4",
      flag: matchedCountry.flag,
      sms_code: ord.sms_code,
    };
  }, []);

  const loadRentalsAndExpireStale = useCallback(
    async (userId: string) => {
      const { supabase } = await import("@/lib/supabase");

      const { data: userOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!userOrders?.length) {
        setActiveRentals([]);
        return;
      }

      const stale = userOrders.filter(
        (o: any) => isWaitingStatus(o.status) && o.created_at && !isWithinHoldWindow(o.created_at)
      );

      if (stale.length > 0) {
        setIsCleaning(true);
        for (const o of stale) {
          try {
            const res = await fetch("/api/rentals/expire", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: o.id }),
            });
            const data = await res.json();
            if (res.ok && data.success && data.newBalance !== undefined) {
              setUserBalance(Number(data.newBalance));
            }
          } catch (e) {
            console.warn("Expire failed", o.id, e);
          }
        }
        setIsCleaning(false);

        const { data: refreshed } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        const mapped = (refreshed || []).map(mapOrder);
        setActiveRentals(
          mapped.filter((r) => isWaitingStatus(r.status) && r.created_at && isWithinHoldWindow(r.created_at))
        );
        return;
      }

      const mapped = userOrders.map(mapOrder);
      setActiveRentals(
        mapped.filter((r) => isWaitingStatus(r.status) && r.created_at && isWithinHoldWindow(r.created_at))
      );
    },
    [mapOrder]
  );

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        const user = data?.user;
        if (user) {
          setCurrentUserId(user.id);

          supabase
            .from("profiles")
            .select("balance")
            .eq("id", user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile && profile.balance !== undefined) {
                setUserBalance(Number(profile.balance));
              }
            });

          loadRentalsAndExpireStale(user.id);
        }
      });
    });

    const syncCurrency = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("nava-currency") || "USD";
        setActiveCurrency(saved);
      }
    };
    syncCurrency();
    window.addEventListener("nava-currency-change", syncCurrency);
    return () => window.removeEventListener("nava-currency-change", syncCurrency);
  }, [loadRentalsAndExpireStale]);

  useEffect(() => {
    if (!currentUserId) return;
    const t = setInterval(() => loadRentalsAndExpireStale(currentUserId), 20000);
    return () => clearInterval(t);
  }, [currentUserId, loadRentalsAndExpireStale]);

  const theme = darkMode
    ? {
        cardBg: "bg-[#111827] border-gray-800",
        cardHover: "hover:border-gray-700 hover:bg-[#1a2332]",
        innerCard: "bg-[#1f2937] border-gray-700/60",
        heroBg: "bg-gradient-to-r from-emerald-950/40 via-gray-900 to-blue-950/40 border-gray-800",
        textTitle: "text-white",
        textMuted: "text-gray-400 font-normal",
        textSubtle: "text-gray-500",
        inputBg: "bg-[#111827] border-gray-800 text-white placeholder-gray-500 focus:border-emerald-500",
        dropdownBg: "bg-[#151c2e] border-gray-800 text-gray-200",
        dropdownHover: "hover:bg-[#1f2937]",
        iconBg: "bg-[#0d1526] border-slate-700/80 shadow-sm",
      }
    : {
        cardBg: "bg-white border-slate-200 shadow-sm",
        cardHover: "hover:border-emerald-500/60 hover:bg-slate-50",
        innerCard: "bg-slate-100 border-slate-200",
        heroBg: "bg-gradient-to-r from-emerald-50 via-white to-blue-50 border-slate-200 shadow-sm",
        textTitle: "text-slate-900",
        textMuted: "text-slate-600 font-semibold",
        textSubtle: "text-slate-500 font-medium",
        inputBg: "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white",
        dropdownBg: "bg-white border-slate-300 text-slate-800 shadow-2xl",
        dropdownHover: "hover:bg-slate-100",
        iconBg: "bg-[#0d1526] border-slate-700/80 shadow-md",
      };

  const currObj = CURRENCIES[activeCurrency] || CURRENCIES.USD;

  const formatPrice = (priceUSD: number) => {
    const val = priceUSD * currObj.rate;
    if (activeCurrency === "NGN" || activeCurrency === "KES") {
      return `${currObj.symbol}${Math.round(val).toLocaleString()}`;
    }
    return `${currObj.symbol}${val.toFixed(2)}`;
  };

  const formatPriceNGN = (priceUSD: number) => {
    return `₦${Math.round(priceUSD * 1500).toLocaleString()}`;
  };

  const filteredServices = useMemo(() => {
    return services.filter((srv) => srv.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [services, searchQuery]);

  const handleRentNumber = async () => {
    if (!currentUserId || !selectedService) {
      setErrorMessage("Please sign in again.");
      return;
    }
    setIsRenting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          serviceSlug: selectedService.id,
          countryCode: selectedCountry.code,
          priceUSD: selectedService.priceUSD,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMessage(data.error || "Failed to rent number");
        setIsRenting(false);
        return;
      }

      if (data.newBalance !== undefined) {
        setUserBalance(data.newBalance);
      }

      const generatedNumber =
        data.order?.phone_number ||
        `${selectedCountry.dial} ${Math.floor(200 + Math.random() * 700)} ${Math.floor(1000 + Math.random() * 9000)}`;

      const createdAtIso = data.order?.created_at || new Date().toISOString();

      const newRental = {
        id: data.order?.id,
        service_name: selectedService.name,
        phone_number: generatedNumber,
        country_name: selectedCountry.name,
        country_code: selectedCountry.code,
        status: "Waiting for SMS...",
        price_usd: data.order?.price_usd || selectedService.priceUSD,
        created_at: createdAtIso,
        created_label: "Just now",
        logo: selectedService.logo,
        flag: selectedCountry.flag,
      };

      setActiveRentals((prev) => [
        newRental,
        ...prev.filter((r) => isWaitingStatus(r.status) && r.created_at && isWithinHoldWindow(r.created_at)),
      ]);

      setActiveModalOrder({
        id: data.order?.id,
        phone_number: generatedNumber,
        service_name: selectedService.name,
        country_code: selectedCountry.code,
        price_usd: data.order?.price_usd || selectedService.priceUSD,
        status: "Waiting for SMS...",
        created_at: createdAtIso,
        logo: selectedService.logo,
      });
      setIsModalOpen(true);
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsRenting(false);
    }
  };

  const handleOpenRentalPanel = (rental: any) => {
    const matchedServiceLogo =
      rental.logo ||
      INITIAL_SERVICES.find((s) => s.name === rental.service_name)?.logo ||
      "https://cdn.simpleicons.org/googlechrome/4285F4";

    setActiveModalOrder({
      id: rental.id,
      phone_number: rental.phone_number,
      service_name: rental.service_name,
      country_code: rental.country_code,
      price_usd: rental.price_usd,
      status: rental.status,
      created_at: rental.created_at,
      logo: matchedServiceLogo,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Top Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between shadow-lg transition-colors`}>
          <div>
            <span className={`text-xs uppercase font-bold tracking-wider block ${theme.textMuted}`}>Wallet Balance</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-mono font-bold ${theme.textTitle}`}>{formatPrice(userBalance)}</span>
              {activeCurrency !== "NGN" && (
                <span className="text-xs font-mono text-emerald-500 font-bold">≈ {formatPriceNGN(userBalance)}</span>
              )}
            </div>
          </div>
          <a
            href="/dashboard/wallet"
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition"
          >
            + Top Up
          </a>
        </div>

        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between shadow-lg transition-colors`}>
          <div>
            <span className={`text-xs uppercase font-bold tracking-wider block ${theme.textMuted}`}>Active Numbers</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-mono font-bold ${theme.textTitle}`}>{activeRentals.length}</span>
              <span className="text-xs text-amber-500 font-bold">
                {isCleaning ? "Clearing expired…" : activeRentals.length > 0 ? "Waiting for SMS" : "No Active Lines"}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-lg">
            📱
          </div>
        </div>

        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between shadow-lg transition-colors`}>
          <div>
            <span className={`text-xs uppercase font-bold tracking-wider block ${theme.textMuted}`}>Verification Guarantee</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-bold text-emerald-500">100%</span>
              <span className={`text-xs ${theme.textSubtle}`}>Auto-Refund · 10 min</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-lg">
            🛡️
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border transition-colors ${theme.heroBg}`}>
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${theme.textTitle}`}>Instant OTP Verification</h1>
          <p className={`text-sm mt-1 ${theme.textMuted}`}>Live wholesale routes powered by Tier-1 providers with NAVA margin protection.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ⚡ Live Server Quotes Loaded
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-auto">
          <div className={`flex items-center gap-2 p-1.5 rounded-xl border ${theme.cardBg}`}>
            <span className={`text-[11px] pl-2 uppercase font-bold tracking-wider ${theme.textMuted}`}>COUNTRY:</span>
            <button
              type="button"
              onClick={() => setIsCountryOpen(!isCountryOpen)}
              className={`flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg border outline-none transition cursor-pointer ${
                darkMode
                  ? "bg-[#1f2937] hover:bg-[#283548] text-white border-gray-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300 font-bold"
              }`}
            >
              <img src={selectedCountry.flag} alt={selectedCountry.name} className="w-4 h-3 object-cover rounded-sm border border-gray-400 shrink-0" />
              <span>
                {selectedCountry.name} ({selectedCountry.dial})
              </span>
              <span className={`text-[10px] ${theme.textSubtle}`}>{isCountryOpen ? "▲" : "▼"}</span>
            </button>
          </div>

          {isCountryOpen && <div className="fixed inset-0 z-40" onClick={() => setIsCountryOpen(false)} />}

          {isCountryOpen && (
            <div className={`absolute top-full left-0 mt-2 w-60 rounded-xl border shadow-2xl z-50 overflow-hidden py-1 ${theme.dropdownBg}`}>
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(c);
                    setIsCountryOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    selectedCountry.code === c.code ? "bg-emerald-500/10 text-emerald-500 font-bold" : theme.dropdownHover
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src={c.flag} alt={c.name} className="w-4 h-3 object-cover rounded-sm border border-gray-400 shrink-0" />
                    <span>{c.name}</span>
                  </div>
                  <span className={`font-mono text-xs ${theme.textSubtle}`}>{c.dial}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="Search service (e.g. WhatsApp, Telegram)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-xl px-4 py-2 text-xs border outline-none transition ${theme.inputBg}`}
          />
        </div>
      </div>

      {/* Isolated live catalog implementation under test */}
      <section className="space-y-3">
        <div>
          <h2 className={`text-base font-bold ${theme.textTitle}`}>NAVA Live OTP Catalog — Test</h2>
          <p className={`text-xs mt-1 ${theme.textSubtle}`}>This catalog is isolated on the test branch and does not replace the existing ordering flow yet.</p>
        </div>
        <OtpCatalog userId={currentUserId} userBalance={userBalance} onBalanceRefresh={() => currentUserId && loadRentalsAndExpireStale(currentUserId)} />
      </section>

      {/* Main Service Grid & Order Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold ${theme.textTitle}`}>Select Service</h2>
            <span className={`text-xs ${theme.textSubtle}`}>
              {isLoadingPrices ? "Loading live quotes..." : `${filteredServices.length} services available`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredServices.map((srv) => {
              const isSelected = selectedService?.id === srv.id;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedService(srv)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold shadow-md shadow-emerald-500/10"
                      : `${theme.cardBg} ${theme.cardHover}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center overflow-hidden shrink-0 p-1.5 ${theme.iconBg}`}>
                        <img
                          src={srv.logo}
                          alt={srv.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://cdn.simpleicons.org/googlechrome/4285F4";
                          }}
                        />
                      </div>
                      <span className={`font-bold text-xs truncate ${isSelected ? "text-emerald-500" : theme.textTitle}`}>
                        {srv.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-black text-emerald-500 mt-2.5 font-mono">
                    {srv.isAvailable ? formatPrice(srv.priceUSD) : "Unavailable"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Service Card */}
        {selectedService && (
          <div className={`${theme.cardBg} border rounded-2xl p-6 h-fit space-y-5 sticky top-20 shadow-lg transition-colors`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${darkMode ? "border-gray-800" : "border-slate-200"}`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 p-2 ${theme.iconBg}`}>
                <img src={selectedService.logo} alt={selectedService.name} className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className={`font-bold text-base ${theme.textTitle}`}>{selectedService.name}</h3>
                <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${theme.textMuted}`}>
                  <img
                    src={selectedCountry.flag}
                    alt={selectedCountry.name}
                    className="w-3.5 h-2.5 object-cover rounded-sm border border-gray-400 shrink-0"
                  />
                  <span>{selectedCountry.name}</span>
                  <span>• {selectedCountry.dial}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className={theme.textMuted}>NAVA Customer Price</span>
                <span className={`font-mono font-bold ${theme.textTitle}`}>{formatPrice(selectedService.priceUSD)}</span>
              </div>
              {activeCurrency !== "NGN" && (
                <div className="flex justify-between">
                  <span className={theme.textMuted}>In NGN</span>
                  <span className="text-emerald-500 font-mono font-bold">{formatPriceNGN(selectedService.priceUSD)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={theme.textMuted}>Supplier Cost</span>
                <span className="font-mono text-gray-400">${selectedService.supplierCostUSD?.toFixed(2)}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 font-semibold rounded-xl text-xs">{errorMessage}</div>
            )}

            <button
              type="button"
              onClick={handleRentNumber}
              disabled={isRenting || !selectedService.isAvailable}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isRenting ? "Allocating number..." : `Rent number - ${formatPrice(selectedService.priceUSD)}`}
            </button>

            <p className={`text-[10px] text-center leading-relaxed ${theme.textSubtle}`}>
              Balance deducted on rent. Auto-refunded if no SMS within 10 minutes. Display price matches charge exactly.
            </p>
          </div>
        )}
      </div>

      {/* Active Rentals Table */}
      <div className={`space-y-4 pt-6 border-t ${darkMode ? "border-gray-800" : "border-slate-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-base font-bold ${theme.textTitle}`}>Active rentals</h2>
          <span className={`text-xs ${theme.textSubtle}`}>
            {activeRentals.length} active
            {isCleaning ? " · refunding expired…" : ""}
          </span>
        </div>

        {activeRentals.length === 0 ? (
          <div className={`${theme.cardBg} border rounded-xl p-8 text-center text-xs ${theme.textMuted}`}>
            No active numbers in the 10-minute hold window. Select a service above and click &quot;Rent number&quot; to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {activeRentals.map((rental) => (
              <div
                key={rental.id}
                className={`${theme.cardBg} border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 p-2 ${theme.iconBg}`}>
                    <img
                      src={rental.logo || "https://cdn.simpleicons.org/googlechrome/4285F4"}
                      alt={rental.service_name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs ${theme.textTitle}`}>{rental.service_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold flex items-center gap-1">
                        <img
                          src={rental.flag || selectedCountry.flag}
                          alt={rental.country_name || selectedCountry.name}
                          className="w-3 h-2 object-cover rounded-sm shrink-0"
                        />
                        <span>{rental.country_name || selectedCountry.name}</span>
                      </span>
                    </div>
                    <div className={`text-sm font-mono font-bold mt-0.5 ${theme.textTitle}`}>{rental.phone_number}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs text-amber-500 font-bold animate-pulse">{rental.status}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenRentalPanel(rental)}
                    className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Open Panel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OtpModal
        order={activeModalOrder}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (currentUserId) loadRentalsAndExpireStale(currentUserId);
        }}
        onBalanceUpdate={(bal) => setUserBalance(bal)}
      />
    </div>
  );
}