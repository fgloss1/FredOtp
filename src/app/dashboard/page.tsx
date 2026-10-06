"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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

const HOLD_MS = 15 * 60 * 1000;

function isPendingStatus(status: string) {
  const s = (status || "").toLowerCase();
  return s === "pending" || s.includes("waiting");
}

function isWithinHoldWindow(createdAtIso: string) {
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < HOLD_MS;
}

interface ActiveRental {
  id: string;
  service_name: string;
  phone_number: string;
  country_name: string;
  country_code: string;
  status: string;
  price_usd: number;
  created_at: string;
  created_label: string;
  sms_code?: string;
  supplier_order_id?: string;
}

export default function DashboardPage() {
  const [activeCurrency, setActiveCurrency] = useState("USD");
  const [userBalance, setUserBalance] = useState<number>(0.0);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const [activeRentals, setActiveRentals] = useState<ActiveRental[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    }
  }, []);

  const mapOrder = useCallback((ord: any): ActiveRental => {
    return {
      id: ord.id,
      service_name: ord.service_name || ord.service || "OTP",
      phone_number: ord.phone_number || ord.number || "",
      country_name: ord.country_code || (ord.country_name || "").toUpperCase() || "—",
      country_code: ord.country_code || "",
      status: ord.status || "pending",
      price_usd: Number(ord.price_usd || ord.price_at_purchase || 0),
      created_at: ord.created_at,
      created_label: ord.created_at
        ? new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "Just now",
      sms_code: ord.sms_code,
      supplier_order_id: ord.supplier_order_id,
    };
  }, []);

  const loadRentalsAndExpireStale = useCallback(
    async (userId: string) => {
      if (!userId) return;
      try {
        const { supabase } = await import("@/lib/supabase");

        const { data: userOrders } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!userOrders?.length) {
          setActiveRentals([]);
          return;
        }

        const stale = userOrders.filter(
          (o: any) => isPendingStatus(o.status) && o.created_at && !isWithinHoldWindow(o.created_at)
        );

        if (stale.length > 0) {
          setIsCleaning(true);
          for (const o of stale) {
            try {
              await fetch("/api/rentals/expire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: o.id }),
              });
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
            .limit(20);

          setActiveRentals((refreshed || []).map(mapOrder));
          return;
        }

        setActiveRentals(userOrders.map(mapOrder));
      } catch (err) {
        console.warn("Failed to load rentals:", err);
      }
    },
    [mapOrder]
  );

  const refreshAllData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", currentUserId)
        .single();

      if (profile && profile.balance !== undefined) {
        setUserBalance(Number(profile.balance));
      }

      await loadRentalsAndExpireStale(currentUserId);
    } catch (e) {
      console.warn("Data refresh failed", e);
    }
  }, [currentUserId, loadRentalsAndExpireStale]);

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
    const t = setInterval(() => loadRentalsAndExpireStale(currentUserId), 15000);
    return () => clearInterval(t);
  }, [currentUserId, loadRentalsAndExpireStale]);

  const handleCancelFromTable = async (rentalId: string) => {
    setCancelingId(rentalId);
    try {
      const res = await fetch("/api/otp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: rentalId }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error("Failed to cancel from table:", e);
    } finally {
      setCancelingId(null);
    }
  };

  const displayRentals = useMemo(() => {
    const pending = activeRentals.filter((r) => isPendingStatus(r.status));
    const completed = activeRentals.filter((r) => !isPendingStatus(r.status));
    const maxPending = Math.min(3, pending.length);
    const maxCompleted = Math.max(0, 3 - maxPending);
    return [...pending.slice(0, maxPending), ...completed.slice(0, maxCompleted)];
  }, [activeRentals]);

  const theme = darkMode
    ? {
        cardBg: "bg-[#111827] border-gray-800 shadow-xl",
        textTitle: "text-white font-extrabold",
        textMuted: "text-gray-400 font-semibold",
        textSubtle: "text-gray-500 font-medium",
        iconBg: "bg-[#0d1526] border-slate-700/80 shadow-sm",
        borderLine: "border-gray-800",
      }
    : {
        cardBg: "bg-white border-slate-300 shadow-md", // Sharp card with clear shadow
        textTitle: "text-slate-900 font-extrabold",
        textMuted: "text-slate-700 font-bold",
        textSubtle: "text-slate-500 font-semibold",
        iconBg: "bg-slate-50 border-slate-200 shadow-inner",
        borderLine: "border-slate-300",
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
    return `${Math.round(priceUSD * 1500).toLocaleString()}`;
  };

  const pendingRentals = activeRentals.filter((r) => isPendingStatus(r.status));

  const getServiceLogoUrl = (serviceName: string) => {
    const slug = serviceName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    return `https://cdn.simpleicons.org/${slug}/10B981`;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between transition-colors`}>
          <div>
            <span className={`text-xs uppercase tracking-wider block ${theme.textMuted}`}>Wallet Balance</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-mono ${theme.textTitle}`}>{formatPrice(userBalance)}</span>
              {activeCurrency !== "NGN" && (
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">≈ {formatPriceNGN(userBalance)}</span>
              )}
            </div>
          </div>
          <a href="/dashboard/wallet" className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-extrabold transition">
            + Top Up
          </a>
        </div>

        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between transition-colors`}>
          <div>
            <span className={`text-xs uppercase tracking-wider block ${theme.textMuted}`}>Active Numbers</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-mono ${theme.textTitle}`}>{pendingRentals.length}</span>
              <span className="text-xs text-amber-600 dark:text-amber-500 font-extrabold">
                {isCleaning ? "Clearing expired…" : pendingRentals.length > 0 ? "Waiting for SMS" : "No Active Lines"}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-lg">📱</div>
        </div>

        <div className={`${theme.cardBg} border rounded-2xl p-5 flex items-center justify-between transition-colors`}>
          <div>
            <span className={`text-xs uppercase tracking-wider block ${theme.textMuted}`}>Verification Guarantee</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-500">100%</span>
              <span className={`text-xs ${theme.textSubtle}`}>Auto-Refund · 15 min</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-lg">🛡️</div>
        </div>
      </div>

      {/* Main OTP Catalog Shelf */}
      <OtpCatalog userBalance={userBalance} onBalanceRefresh={refreshAllData} />

      {/* Active Rentals & Activity Table */}
      <div className={`space-y-4 pt-4 border-t ${theme.borderLine}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-base ${theme.textTitle}`}>Active now</h2>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${theme.textSubtle}`}>{displayRentals.length} {displayRentals.length === 1 ? "line" : "lines"}</span>
            <Link href="/dashboard/history" className="text-xs font-extrabold text-emerald-600 hover:text-emerald-500 transition-colors">
              View all →
            </Link>
          </div>
        </div>

        {displayRentals.length === 0 ? (
          <div className={`${theme.cardBg} border rounded-xl p-8 text-center text-xs ${theme.textMuted}`}>
            No active or recent lines. Select a country and service above to purchase an OTP number.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayRentals.map((rental) => {
                const isPending = isPendingStatus(rental.status);
                const isCompleted = rental.status === "completed" || !!rental.sms_code;
                const isCanceled = rental.status === "canceled" || rental.status === "refunded";

                return (
                  <div
                    key={rental.id}
                    className={`${theme.cardBg} border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${theme.iconBg}`}>
                        <img
                          src={getServiceLogoUrl(rental.service_name)}
                          alt={rental.service_name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = e.target as HTMLImageElement;
                            fallback.parentElement!.innerHTML = `<span class="text-sm font-extrabold text-emerald-600">${rental.service_name.charAt(0)}</span>`;
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-extrabold text-xs uppercase ${theme.textTitle}`}>{rental.service_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold uppercase">
                            {rental.country_name}
                          </span>
                          <span className={`text-[10px] ${theme.textSubtle}`}>{rental.created_label}</span>
                        </div>
                        <div className={`text-sm font-mono font-bold mt-0.5 ${theme.textTitle}`}>{rental.phone_number}</div>
                        {rental.sms_code && (
                          <div className="text-xs font-mono font-bold mt-1 text-emerald-600 flex items-center gap-1.5">
                            <span>Code:</span>
                            <span className="text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">{rental.sms_code}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-right">
                        <span className={`text-xs font-extrabold uppercase block ${isCompleted ? "text-emerald-600" : isCanceled ? "text-rose-600" : "text-amber-600 animate-pulse"}`}>
                          {isCompleted ? "Completed" : isCanceled ? "Refunded" : "Listening for SMS..."}
                        </span>
                        <span className={`text-[10px] font-mono ${theme.textSubtle}`}>{formatPrice(rental.price_usd)}</span>
                      </div>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelFromTable(rental.id)}
                          disabled={cancelingId === rental.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          {cancelingId === rental.id ? "Refunding..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayRentals.length > 0 && (
              <div className="flex justify-end pt-2">
                <Link href="/dashboard/history" className="text-xs font-extrabold text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1">
                  View full history →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}