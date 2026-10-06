"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import OtpModal from "@/components/OtpModal";

interface ServiceOption {
  name: string;
  slug: string;
  priceUsd: number;
}

interface CountryOption {
  name: string;
  code: string;
}

export default function RentalsPage() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [currency, setCurrency] = useState<"USD" | "NGN">("USD");
  const [balanceUsd, setBalanceUsd] = useState<number>(0.0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // Rental Mode State ('quick' | 'webline' | 'esim')
  const [rentalMode, setRentalMode] = useState<"quick" | "webline" | "esim">("webline");

  // Form State
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>({ name: "United States", code: "US" });
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceOption>({ name: "ChatGPT / OpenAI", slug: "openai", priceUsd: 0.60 });
  const [isOrdering, setIsOrdering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Active OTP Modal State
  const [activeModalOrder, setActiveModalOrder] = useState<any | null>(null);

  // Scroll Target Reference
  const orderPanelRef = useRef<HTMLDivElement | null>(null);

  const countries: CountryOption[] = [
    { name: "United States (+1)", code: "US" },
    { name: "United Kingdom (+44)", code: "GB" },
    { name: "Canada (+1)", code: "CA" },
    { name: "Germany (+49)", code: "DE" },
    { name: "Netherlands (+31)", code: "NL" },
  ];

  const services: ServiceOption[] = [
    { name: "ChatGPT / OpenAI", slug: "openai", priceUsd: 0.60 },
    { name: "WhatsApp", slug: "whatsapp", priceUsd: 0.75 },
    { name: "Telegram", slug: "telegram", priceUsd: 0.85 },
    { name: "TikTok", slug: "tiktok", priceUsd: 0.50 },
    { name: "Google / Gmail", slug: "google", priceUsd: 0.65 },
    { name: "Instagram", slug: "instagram", priceUsd: 0.55 },
    { name: "Tinder", slug: "tinder", priceUsd: 0.90 },
  ];

  useEffect(() => {
    // Theme sync
    const checkTheme = () => {
      const saved = localStorage.getItem("nava-theme");
      setDarkMode(saved !== "light");
    };
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);

    // Currency sync
    const checkCurrency = () => {
      const saved = localStorage.getItem("nava-currency");
      setCurrency(saved === "NGN" ? "NGN" : "USD");
    };
    checkCurrency();
    window.addEventListener("nava-currency-change", checkCurrency);

    // Fetch User Profile
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
        setUserEmail(data.user.email || "");
        supabase
          .from("profiles")
          .select("balance")
          .eq("id", data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) setBalanceUsd(Number(profile.balance));
          });
      }
    });

    return () => {
      window.removeEventListener("nava-theme-change", checkTheme);
      window.removeEventListener("nava-currency-change", checkCurrency);
    };
  }, []);

  const rate = 1500;
  const formatAmt = (usd: number) => {
    if (currency === "NGN") return `₦${(usd * rate).toLocaleString()}`;
    return `$${usd.toFixed(2)}`;
  };

  const handleSelectCard = (mode: "quick" | "webline" | "esim") => {
    // Block selection for coming soon cards
    if (mode === "webline" || mode === "esim") {
      setErrorMessage("This service is coming soon. Please select Quick Code (OTP) for now.");
      return;
    }
    setRentalMode(mode);
    setErrorMessage(null);
    setOrderSuccessMsg(null);
    if (orderPanelRef.current) {
      orderPanelRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Order Execution Handler
  const handleOrderNumber = async () => {
    if (!userId) {
      setErrorMessage("Please sign in to rent a phone number.");
      return;
    }

    const priceToDeduct = rentalMode === "esim" ? 30.0 : rentalMode === "webline" ? 3.5 : selectedService.priceUsd;

    if (balanceUsd < priceToDeduct) {
      setErrorMessage(`Insufficient wallet balance (${formatAmt(priceToDeduct)} required). Please top up your wallet.`);
      return;
    }

    setIsOrdering(true);
    setErrorMessage(null);
    setOrderSuccessMsg(null);

    // 1. T-Mobile USA 30-Day eSIM Order Path
    if (rentalMode === "esim") {
      try {
        const { error: dbErr } = await supabase.from("esim_rentals").insert({
          user_id: userId,
          customer_name: userEmail.split("@")[0],
          customer_email: userEmail,
          carrier_plan: "T-Mobile USA (30-Day eSIM)",
          resale_price: 30.0,
          wholesale_cost: 7.05,
          status: "pending",
        });

        if (dbErr) throw dbErr;

        // Deduct $30 from user profile balance
        const newBalance = Number((balanceUsd - 30.0).toFixed(2));
        await supabase.from("profiles").update({ balance: newBalance }).eq("id", userId);
        setBalanceUsd(newBalance);

        setOrderSuccessMsg("📲 T-Mobile USA eSIM ordered successfully! Your QR code activation details will be fulfilled shortly via the Admin Desk.");
      } catch (err: any) {
        setErrorMessage("eSIM order failed: " + err.message);
      } finally {
        setIsOrdering(false);
      }
      return;
    }

    // 2. Quick Code OTP / Web Line Order Path
    try {
      const res = await fetch("/api/rentals/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          service: rentalMode === "webline" ? `${selectedService.name} (4-Hour Web Line)` : selectedService.name,
          country: selectedCountry.code,
          priceUsd: priceToDeduct,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBalanceUsd(data.newBalance);
        setActiveModalOrder({
          orderId: data.orderId,
          phoneNumber: data.phoneNumber,
          serviceName: data.serviceName,
          countryCode: data.countryCode,
          priceUsd: data.priceUsd,
        });
      } else {
        setErrorMessage(data.error || "Failed to order number.");
      }
    } catch (err: any) {
      setErrorMessage("Network error placing order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  // Dynamic Theme Tokens
  const c = darkMode
    ? {
        title: "text-white",
        muted: "text-gray-400",
        card: "bg-[#0d1526] border-slate-800 shadow-xl",
        cardHover: "hover:border-slate-700",
        iconBox: "bg-[#152035] border-slate-700/80 text-white",
        divider: "border-slate-800",
        btnInactive: "bg-[#152035] text-gray-300 border-slate-700",
        innerBox: "bg-[#152035] border-slate-800 text-white",
        dropdownBtn: "bg-[#152035] border-slate-700/80 text-white hover:border-slate-600",
        dropdownMenu: "bg-[#152035] border-slate-700 text-white",
        dropdownItem: "text-gray-300 hover:bg-[#0d1526]",
        srvInactive: "bg-[#152035] border-slate-800 text-gray-400 hover:border-slate-700",
      }
    : {
        title: "text-slate-900 font-extrabold",
        muted: "text-slate-600 font-semibold",
        card: "bg-white border-slate-200 shadow-sm text-slate-900",
        cardHover: "hover:border-slate-300",
        iconBox: "bg-slate-100 border-slate-200 text-slate-800",
        divider: "border-slate-200",
        btnInactive: "bg-slate-100 text-slate-700 border-slate-300 font-bold hover:bg-slate-200",
        innerBox: "bg-slate-50 border-slate-200 text-slate-900",
        dropdownBtn: "bg-white border-slate-300 text-slate-900 hover:border-slate-400 shadow-sm",
        dropdownMenu: "bg-white border-slate-300 text-slate-800 shadow-2xl",
        dropdownItem: "text-slate-700 hover:bg-slate-100",
        srvInactive: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold",
      };

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
      {/* 3-Card Plain English Selection Shelf */}
      <div className="space-y-4">
        <div>
          <h1 className={`text-xl sm:text-2xl tracking-tight ${c.title}`}>Choose Your Rental Service</h1>
          <p className={`text-xs mt-1 ${c.muted}`}>Click a card below to configure that line type in the order panel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Quick Code (ACTIVE) */}
          <div
            onClick={() => setErrorMessage("Rental Services are coming soon. Please use Buy OTP from the main dashboard.")}
            className={`cursor-pointer rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 relative flex flex-col justify-between transition-all border ${
              rentalMode === "quick"
                ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg"
                : `${c.card} ${c.cardHover}`
            }`}
          >
            <span className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Coming Soon
            </span>
            <div className="space-y-2">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl ${c.iconBox}`}>
                ⚡
              </div>
              <h3 className={`text-base sm:text-lg font-black ${c.title}`}>1. Quick Code (OTP)</h3>
              <p className={`text-xs leading-relaxed ${c.muted}`}>
                Receive 1 single verification code instantly. Ideal for ChatGPT, WhatsApp, Telegram, or Google registration.
              </p>
            </div>
            <div className={`pt-4 border-t flex items-center justify-between gap-2 ${c.divider}`}>
              <div>
                <span className={`text-[10px] uppercase font-bold block ${c.muted}`}>Starting From</span>
                <span className="text-sm sm:text-base font-black text-emerald-500">{formatAmt(0.50)}</span>
              </div>
              <button
                type="button"
                className={`text-xs font-black px-3.5 sm:px-4 py-2.5 rounded-xl transition-all shadow-md ${
                  rentalMode === "quick" ? "bg-emerald-500 text-black" : c.btnInactive
                }`}
              >
                {rentalMode === "quick" ? "Selected ✓" : "Coming Soon"}
              </button>
            </div>
          </div>

          {/* Card 2: Web Line (COMING SOON) */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 relative flex flex-col justify-between transition-all border opacity-60 ${c.card}`}
          >
            <span className="absolute top-4 right-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Coming Soon
            </span>
            <div className="space-y-2">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl ${c.iconBox}`}>
                💻
              </div>
              <h3 className={`text-base sm:text-lg font-black ${c.title}`}>2. Web Line (Multiple SMS)</h3>
              <p className={`text-xs leading-relaxed ${c.muted}`}>
                Rent a number for up to 4 Hours. Receive multiple codes from the same service for re-verification.
              </p>
            </div>
            <div className={`pt-4 border-t flex items-center justify-between gap-2 ${c.divider}`}>
              <div>
                <span className={`text-[10px] uppercase font-bold block ${c.muted}`}>Starting From</span>
                <span className="text-sm sm:text-base font-black text-blue-500">{formatAmt(3.50)}</span>
              </div>
              <button
                type="button"
                disabled
                className="text-xs font-black px-3.5 sm:px-4 py-2.5 rounded-xl transition-all shadow-md bg-slate-700 text-gray-400 border border-slate-600 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>

          {/* Card 3: T-Mobile USA 30-Day eSIM (COMING SOON) */}
          <div
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 relative flex flex-col justify-between transition-all border opacity-60 ${c.card}`}
          >
            <span className="absolute top-4 right-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Coming Soon
            </span>
            <div className="space-y-2">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl ${c.iconBox}`}>
                📲
              </div>
              <h3 className={`text-base sm:text-lg font-black ${c.title}`}>3. Original Tier One Premium T-Mobile, AT&T & Verizon</h3>
              <p className={`text-xs leading-relaxed ${c.muted}`}>
                30-Day dedicated US mobile line provided via QR code eSIM for long-term personal, banking, or business usage.
              </p>
            </div>
            <div className={`pt-4 border-t flex items-center justify-between gap-2 ${c.divider}`}>
              <div>
                <span className={`text-[10px] uppercase font-bold block ${c.muted}`}>Flat Rate / 30 Days</span>
                <span className="text-sm sm:text-base font-black text-amber-500">{formatAmt(30.00)}</span>
              </div>
              <button
                type="button"
                disabled
                className="text-xs font-black px-3.5 sm:px-4 py-2.5 rounded-xl transition-all shadow-md bg-slate-700 text-gray-400 border border-slate-600 cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Order Panel Section */}
      <div ref={orderPanelRef} id="order-panel" className={`border rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6 sm:space-y-8 shadow-2xl ${c.card}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${c.title}`}>
              <span> Configure Instant Rental</span>
            </h2>
            <p className={`text-xs ${c.muted}`}>
              {rentalMode === "quick" && "Mode: Quick Code (1 Single Verification OTP)"}
              {rentalMode === "webline" && "Mode: Web Line (Multiple Codes for up to 4 Hours)"}
              {rentalMode === "esim" && "Mode: Dedicated T-Mobile USA 30-Day Mobile eSIM"}
            </p>
          </div>

          <span
            className={`text-xs font-bold px-3 py-1 rounded-xl border ${
              rentalMode === "quick"
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : rentalMode === "webline"
                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}
          >
            {rentalMode === "quick" && "⚡ Single OTP Mode"}
            {rentalMode === "webline" && "💻 4-Hour Web Line"}
            {rentalMode === "esim" && "📲 T-Mobile USA 30-Day eSIM"}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-500 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {orderSuccessMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            {orderSuccessMsg}
          </div>
        )}

        {/* Mode 1 & Mode 2: Quick Code or Web Line Selector */}
        {(rentalMode === "quick" || rentalMode === "webline") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Country Picker (Compact Dropdown) */}
            <div className="space-y-2">
              <label className={`block text-xs uppercase tracking-wider ${c.muted}`}>Select Country</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                  className={`w-full rounded-xl p-3 text-xs font-bold flex items-center justify-between transition-all border ${c.dropdownBtn}`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                      alt={selectedCountry.name}
                      className="w-5 h-3.5 rounded-sm object-cover"
                    />
                    <span>{selectedCountry.name}</span>
                  </div>
                  <span className={`text-[10px] ${c.muted}`}>{isCountryDropdownOpen ? "▲" : "▼"}</span>
                </button>

                {isCountryDropdownOpen && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl z-30 border ${c.dropdownMenu}`}>
                    {countries.map((cOption) => (
                      <button
                        key={cOption.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(cOption);
                          setIsCountryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 text-xs font-semibold text-left transition-all ${
                          selectedCountry.code === cOption.code
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                            : c.dropdownItem
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://flagcdn.com/w40/${cOption.code.toLowerCase()}.png`}
                            alt={cOption.name}
                            className="w-5 h-3.5 rounded-sm object-cover"
                          />
                          <span>{cOption.name}</span>
                        </div>
                        {selectedCountry.code === cOption.code && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Service Platform Picker */}
            <div className="space-y-2">
              <label className={`block text-xs uppercase tracking-wider ${c.muted}`}>Select Platform / App</label>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {services.map((s) => {
                  const isSelected = selectedService.slug === s.slug;
                  const itemPrice = rentalMode === "webline" ? 3.5 : s.priceUsd;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setSelectedService(s)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500 font-bold shadow-lg"
                          : c.srvInactive
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-[#0d1526] border border-slate-800 flex items-center justify-center p-1.5 shrink-0">
                          <img
                            src={`https://cdn.simpleicons.org/${s.slug}/10B981`}
                            alt={s.name}
                            className="w-4 h-4 object-contain"
                          />
                        </div>
                        <span className={darkMode ? "text-white" : "text-slate-900"}>{s.name}</span>
                      </div>
                      <span className="font-mono text-emerald-500 font-bold">{formatAmt(itemPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mode 3: Dedicated T-Mobile USA eSIM Banner */}
        {rentalMode === "esim" && (
          <div className={`border rounded-2xl p-6 space-y-4 ${c.innerBox}`}>
            <div className="flex items-center gap-3">
              <img src="https://flagcdn.com/w40/us.png" alt="United States" className="w-8 h-5 rounded-sm object-cover" />
              <div>
                <h3 className={`text-base font-black ${c.title}`}>T-Mobile USA — 30-Day Dedicated Line</h3>
                <p className={`text-xs ${c.muted}`}>Includes real mobile SIM network routing, SMS, voice, and instant eSIM QR activation.</p>
              </div>
            </div>
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t ${c.divider}`}>
              <div>
                <span className={`block text-[10px] uppercase ${c.muted}`}>Carrier</span>
                <span className="font-bold text-amber-500">T-Mobile USA</span>
              </div>
              <div>
                <span className={`block text-[10px] uppercase ${c.muted}`}>Duration</span>
                <span className={`font-bold ${c.title}`}>30 Days</span>
              </div>
              <div>
                <span className={`block text-[10px] uppercase ${c.muted}`}>Format</span>
                <span className={`font-bold ${c.title}`}>eSIM QR Code</span>
              </div>
              <div>
                <span className={`block text-[10px] uppercase ${c.muted}`}>Rate</span>
                <span className="font-bold text-emerald-500">{formatAmt(30.0)} / mo</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer Bar */}
        <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 ${c.innerBox}`}>
          <div className="flex items-center gap-3">
            <img
              src={`https://flagcdn.com/w40/${rentalMode === "esim" ? "us" : selectedCountry.code.toLowerCase()}.png`}
              alt="Country"
              className="w-6 h-4 rounded-sm object-cover"
            />
            <div>
              <span className={`text-xs font-bold block ${c.title}`}>
                {rentalMode === "esim" ? "T-Mobile USA (30-Day eSIM)" : `${selectedService.name} (${selectedCountry.code})`}
              </span>
              <span className={`text-[10px] font-mono ${c.muted}`}>
                Total Charge:{" "}
                <strong className="text-emerald-500 font-bold">
                  {formatAmt(rentalMode === "esim" ? 30.0 : rentalMode === "webline" ? 3.5 : selectedService.priceUsd)}
                </strong>
              </span>
            </div>
          </div>

          <button
            onClick={handleOrderNumber}
            disabled={isOrdering || rentalMode !== "quick"}
            className={`w-full sm:w-auto font-black text-xs px-8 py-3.5 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 ${
              rentalMode !== "quick"
                ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                : isOrdering
                ? "bg-emerald-600 text-black"
                : "bg-emerald-500 hover:bg-emerald-400 text-black"
            }`}
          >
            {isOrdering ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                <span>Generating Line...</span>
              </>
            ) : rentalMode !== "quick" ? (
              <span>Coming Soon</span>
            ) : (
              <span>
                Get Number Now ({formatAmt(selectedService.priceUsd)}) →
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live OTP Modal Popup */}
      {activeModalOrder && (
        <OtpModal
          orderId={activeModalOrder.orderId}
          phoneNumber={activeModalOrder.phoneNumber}
          serviceName={activeModalOrder.serviceName}
          countryCode={activeModalOrder.countryCode}
          priceUsd={activeModalOrder.priceUsd}
          onClose={() => setActiveModalOrder(null)}
          onBalanceUpdate={(newBal) => setBalanceUsd(newBal)}
        />
      )}
    </div>
  );
}