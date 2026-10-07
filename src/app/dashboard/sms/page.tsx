"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const response = await fetch(`/api/phone/available?country=${encodeURIComponent(country)}`, {
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

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className={`${theme.innerCard} rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400`}
              >
                {countries.map(([code, flag, name]) => (
                  <option key={code} value={code}>
                    {flag} {name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={searchNumbers}
                disabled={searching}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? "Searching..." : "Search Numbers"}
              </button>
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
                          disabled
                          className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500"
                        >
                          Get Number
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {numbers.length > 0 && (
            <div className={`${theme.card} rounded-3xl p-6`}>
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
