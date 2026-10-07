"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PhoneNumber = {
  id: string;
  phone_number: string;
  status: "active" | "suspended" | "released";
  country_code: string | null;
  capabilities: Record<string, unknown>;
  monthly_price: number;
  created_at: string;
};

type AvailableNumber = {
  phone_number: string;
  monthly_price: number;
  capabilities: {
    sms: boolean;
    voice: boolean;
  };
};

const countries = [
  ["US", "🇺🇸", "United States"],
  ["CA", "🇨🇦", "Canada"],
  ["GB", "🇬🇧", "United Kingdom"],
  ["AU", "🇦🇺", "Australia"],
  ["DE", "🇩🇪", "Germany"],
  ["FR", "🇫🇷", "France"],
  ["NL", "🇳🇱", "Netherlands"],
  ["NG", "🇳🇬", "Nigeria"],
];

export default function PhonePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [country, setCountry] = useState("US");
  const [searchType, setSearchType] = useState("any");
  const [pattern, setPattern] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [rateCenter, setRateCenter] = useState("");
  const [numberType, setNumberType] = useState("");
  const [capability, setCapability] = useState("sms");
  const [quickship, setQuickship] = useState(false);
  const [reservable, setReservable] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasingNumber, setPurchasingNumber] = useState("");
  const myNumbersRef = useRef<HTMLDivElement | null>(null);
  const scrollToMyNumbersRef = useRef(false);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    };

    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPhoneNumbers() {
      try {
        setLoading(true);
        setError("");

        const { supabase } = await import("@/lib/supabase");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (!cancelled) setError("Your session has expired. Please sign in again.");
          return;
        }

        const response = await fetch("/api/phone", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load Phone service.");
        }

        if (!cancelled) {
          setNumbers(Array.isArray(data?.numbers) ? data.numbers : []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Unable to load Phone service.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPhoneNumbers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollToMyNumbersRef.current || numbers.length === 0) return;

    scrollToMyNumbersRef.current = false;
    const scrollToNumbers = () => {
      myNumbersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToNumbers);
    });
  }, [numbers.length]);

  const searchNumbers = async () => {
    try {
      setSearching(true);
      setError("");
      setAvailableNumbers([]);

      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const params = new URLSearchParams({
        country, searchType, pattern, areaCode, city, state, rateCenter,
        numberType, capability, quickship: String(quickship), reservable: String(reservable),
      });

      const response = await fetch(`/api/phone/available?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to search numbers.");
      }

      setAvailableNumbers(Array.isArray(data?.numbers) ? data.numbers : []);
    } catch (err: any) {
      setError(err?.message || "Unable to search numbers.");
    } finally {
      setSearching(false);
    }
  };

  const getNumber = async (phoneNumber: string) => {
    try {
      setPurchasingNumber(phoneNumber);
      setError("");

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/phone/purchase", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: phoneNumber, country_code: country, monthly_price: availableNumbers.find((item) => item.phone_number === phoneNumber)?.monthly_price }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to get this number.");

      setAvailableNumbers((current) => current.filter((item) => item.phone_number !== phoneNumber));
      scrollToMyNumbersRef.current = true;
      setNumbers((current) => [data.number, ...current]);
    } catch (err: any) {
      setError(err?.message || "Unable to get this number.");
    } finally {
      setPurchasingNumber("");
    }
  };

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800 shadow-md",
        innerCard: "bg-[#070d19] border border-slate-800/80",
        text: "text-white",
        textMuted: "text-gray-400",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        innerCard: "bg-slate-50 border-2 border-slate-200",
        text: "text-slate-900",
        textMuted: "text-slate-600 font-medium",
      };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      <div>
        <h1 className="text-2xl font-bold">NAVA Phone</h1>
        <p className={`${theme.textMuted} text-xs mt-0.5`}>
          Your dedicated NAVA number for SMS and calling.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className={`${theme.card} rounded-3xl p-8 text-center`}>
          <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className={`text-xs ${theme.textMuted}`}>Loading your NAVA Phone...</p>
        </div>
      ) : (
        <>
          <div className={`${theme.card} rounded-3xl p-6 sm:p-8`}>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                ["💬", "SMS", "Send and receive messages.", "/dashboard/sms/inbox"],
                ["📞", "Calling", "Make and receive calls.", "/dashboard/sms/calling"],
                ["🌐", "Web Dialer", "Use your NAVA number from the dashboard.", "/dashboard/sms/dialer"],
              ].map(([icon, title, description, href]) => (
                <Link
                  key={title}
                  href={href}
                  className={`${theme.innerCard} rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-emerald-500/5 focus:outline-none focus:ring-2 focus:ring-emerald-400/50`}
                >
                  <div className="text-2xl">{icon}</div>
                  <div className="mt-2 text-xs font-bold">{title}</div>
                  <div className={`mt-1 text-[10px] leading-relaxed ${theme.textMuted}`}>{description}</div>
                  <div className="mt-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Open</div>
                </Link>
              ))}
            </div>

            <div>
              <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Get a Number
              </span>
              <h2 className="mt-3 text-xl font-bold">Choose your country</h2>
              <p className={`mt-1 text-xs ${theme.textMuted}`}>
                Search available NAVA numbers with SMS support. You are not charged by searching.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select value={country} onChange={(event) => setCountry(event.target.value)} className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400">
                {countries.map(([code, flag, name]) => (<option key={code} value={code}>{flag} {name}</option>))}
              </select>
              <select value={capability} onChange={(event) => setCapability(event.target.value)} className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400">
                <option value="sms">SMS</option><option value="voice">Voice</option><option value="mms">MMS</option><option value="emergency">Voice + Emergency</option>
              </select>
              <select value={numberType} onChange={(event) => setNumberType(event.target.value)} className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400">
                <option value="">Any number type</option><option value="local">Local</option><option value="toll_free">Toll-free</option><option value="mobile">Mobile</option><option value="national">National</option><option value="shared_cost">Shared cost</option>
              </select>
              <select value={searchType} onChange={(event) => setSearchType(event.target.value)} className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400">
                <option value="any">No number pattern</option><option value="starts">Starts with</option><option value="ends">Ends with</option><option value="contains">Contains</option>
              </select>
              {searchType !== "any" && <input value={pattern} onChange={(event) => setPattern(event.target.value.replace(/\D/g, "").slice(0, 15))} placeholder="Number code" inputMode="numeric" className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />}
              <input value={areaCode} onChange={(event) => setAreaCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Area code" inputMode="numeric" className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />
              <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City / region" className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />
              {(country === "US" || country === "CA") && <input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 3))} placeholder="State / province" className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />}
              <input value={rateCenter} onChange={(event) => setRateCenter(event.target.value)} placeholder="Rate center" className="${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2"><input type="checkbox" checked={quickship} onChange={(event) => setQuickship(event.target.checked)} /> Quickship</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={reservable} onChange={(event) => setReservable(event.target.checked)} /> Reservable</label>
              <button type="button" onClick={searchNumbers} disabled={searching} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">{searching ? "Searching..." : "Search Numbers"}</button>
            </div>

            {availableNumbers.length === 0 && !searching && (
              <div className={`mt-5 rounded-2xl ${theme.innerCard} p-5 text-center`}>
                <div className="text-2xl">📱</div>
                <p className="mt-2 text-sm font-bold">Ready to find your NAVA number</p>
                <p className={`mt-1 text-[10px] ${theme.textMuted}`}>
                  Select a country and search for available numbers.
                </p>
              </div>
            )}

            {availableNumbers.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {availableNumbers.map((number) => (
                  <div
                    key={number.phone_number}
                    className={`${theme.innerCard} rounded-2xl p-4`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black tracking-wide">
                          {number.phone_number}
                        </div>
                        <div className={`mt-2 flex gap-2 text-[9px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                          {number.capabilities.sms && <span>SMS</span>}
                          {number.capabilities.voice && <span>Voice</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-400">
                          ${number.monthly_price.toFixed(2)}/mo
                        </div>
                        <button
                          type="button"
                          onClick={() => getNumber(number.phone_number)}
                          disabled={purchasingNumber !== ""}
                          className="mt-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {purchasingNumber === number.phone_number ? "Getting..." : "Get Number"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {numbers.length > 0 && (
            <div ref={myNumbersRef} className={`${theme.card} rounded-3xl p-6`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                My NAVA Numbers
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {numbers.length} number{numbers.length === 1 ? "" : "s"}
              </h2>

              <div className="mt-5 space-y-3">
                {numbers.map((number) => (
                  <Link
                    key={number.id}
                    href="/dashboard/sms/inbox"
                    className={`${theme.innerCard} block rounded-2xl p-4 transition hover:border-emerald-500/50 hover:bg-emerald-500/5`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-black tracking-wide">{number.phone_number}</div>
                        <div className={`mt-1 text-[10px] ${theme.textMuted}`}>
                          {number.country_code || "—"} · {number.status}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-emerald-400">Open SMS</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
