"use client";

import { useEffect, useState } from "react";

type PhoneNumber = {
  id: string;
  phone_number: string;
  telnyx_phone_number_id: string | null;
  status: "active" | "suspended" | "released";
  country_code: string | null;
  capabilities: Record<string, unknown>;
  monthly_price: number;
  created_at: string;
};

export default function PhonePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
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
          if (!cancelled) {
            setError("Your session has expired. Please sign in again.");
          }
          return;
        }

        const response = await fetch("/api/phone", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
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
        if (!cancelled) {
          setError(err?.message || "Unable to load Phone service.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPhoneNumbers();

    return () => {
      cancelled = true;
    };
  }, []);

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
          <p className={`text-xs ${theme.textMuted}`}>
            Loading your NAVA Phone...
          </p>
        </div>
      ) : numbers.length === 0 ? (
        <div className={`${theme.card} rounded-3xl p-8 sm:p-10`}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-3xl">
            📱
          </div>

          <div className="mx-auto mt-5 max-w-xl text-center space-y-2">
            <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              NAVA Phone
            </span>
            <h2 className="text-xl font-bold">Get your own NAVA number</h2>
            <p className={`text-xs leading-relaxed ${theme.textMuted}`}>
              Your NAVA number will support ongoing SMS conversations first,
              followed by voice calling and browser calling.
            </p>
          </div>

          <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ["💬", "SMS", "Send and receive messages."],
              ["📞", "Calling", "Make and receive calls."],
              ["🌐", "Web dialer", "Use your number from the dashboard."],
            ].map(([icon, title, description]) => (
              <div
                key={title}
                className={`${theme.innerCard} rounded-2xl p-4 text-center`}
              >
                <div className="text-2xl">{icon}</div>
                <div className="mt-2 text-xs font-bold">{title}</div>
                <div className={`mt-1 text-[10px] leading-relaxed ${theme.textMuted}`}>
                  {description}
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-7 max-w-md rounded-2xl border border-pink-500/30 bg-pink-950/30 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
              Number provisioning
            </p>
            <p className={`mt-1 text-xs ${theme.textMuted}`}>
              Telnyx number search and secure checkout are the next step.
            </p>
          </div>
        </div>
      ) : (
        <div className={`${theme.card} rounded-3xl p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted}`}>
                My NAVA Numbers
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {numbers.length} number{numbers.length === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-400">
              Telnyx powered
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {numbers.map((number) => (
              <div
                key={number.id}
                className={`${theme.innerCard} rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <div>
                  <div className="text-lg font-black tracking-wide">
                    {number.phone_number}
                  </div>
                  <div className={`mt-1 text-[10px] ${theme.textMuted}`}>
                    {number.country_code || "—"} · {number.status}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-emerald-400">
                    SMS ready
                  </div>
                  <div className={`text-[10px] ${theme.textMuted}`}>
                    Voice coming next
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
