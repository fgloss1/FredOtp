"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HistoryStatus = "all" | "pending" | "completed" | "canceled" | "refunded" | "expired";

interface HistoryRow {
  id: string;
  service_name: string;
  phone_number: string;
  country_code: string;
  status: string;
  price_usd: number;
  sms_code: string | null;
  created_at: string;
  supplier_order_id: string | null;
}

const PAGE_SIZE = 25;

const FILTERS: { id: HistoryStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "refunded", label: "Refunded" },
  { id: "canceled", label: "Canceled" },
  { id: "expired", label: "Expired" },
];

function normalizeStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("wait") || s === "pending") return "pending";
  if (s === "completed" || s === "received") return "completed";
  if (s === "refunded") return "refunded";
  if (s === "canceled" || s === "cancelled" || s === "cancel") return "canceled";
  if (s === "expired" || s === "timeout" || s === "banned") return "expired";
  return s || "unknown";
}

function statusStyle(status: string): string {
  switch (normalizeStatus(status)) {
    case "completed":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "pending":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "refunded":
    case "canceled":
      return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    case "expired":
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  }
}

function statusLabel(status: string): string {
  const s = normalizeStatus(status);
  if (s === "pending") return "Pending";
  if (s === "completed") return "Completed";
  if (s === "refunded") return "Refunded";
  if (s === "canceled") return "Canceled";
  if (s === "expired") return "Expired";
  return s;
}

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadHistory = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error: qErr } = await supabase
        .from("orders")
        .select(
          "id, service_name, phone_number, country_code, status, price_usd, sms_code, created_at, supplier_order_id"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(500);

      if (qErr) throw qErr;

      const mapped: HistoryRow[] = (data || []).map((o: any) => ({
        id: o.id,
        service_name: o.service_name || "OTP",
        phone_number: o.phone_number || "",
        country_code: (o.country_code || "").toUpperCase(),
        status: o.status || "pending",
        price_usd: Number(o.price_usd || 0),
        sms_code: o.sms_code || null,
        created_at: o.created_at,
        supplier_order_id: o.supplier_order_id || null,
      }));

      setRows(mapped);
    } catch (e: any) {
      console.error("History load failed:", e);
      setError(e?.message || "Failed to load history.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        if (!uid || cancelled) {
          if (!cancelled) {
            setError("Please sign in to view history.");
            setLoading(false);
          }
          return;
        }
        setUserId(uid);
        await loadHistory(uid);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Auth error.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const st = normalizeStatus(r.status);
      if (filter !== "all" && st !== filter) return false;
      if (!q) return true;
      return (
        r.service_name.toLowerCase().includes(q) ||
        r.phone_number.toLowerCase().includes(q) ||
        r.country_code.toLowerCase().includes(q) ||
        (r.sms_code || "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const stats = useMemo(() => {
    const s = { total: rows.length, completed: 0, refunded: 0, pending: 0 };
    for (const r of rows) {
      const st = normalizeStatus(r.status);
      if (st === "completed") s.completed++;
      else if (st === "refunded" || st === "canceled") s.refunded++;
      else if (st === "pending") s.pending++;
    }
    return s;
  }, [rows]);

  function copyText(key: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-300">History</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Activation History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Full dump of purchases, codes, cancellations, and refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => userId && loadHistory(userId)}
            disabled={loading || !userId}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 transition"
          >
            ← Back to buy
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Completed", value: stats.completed, color: "text-emerald-400" },
          { label: "Pending", value: stats.pending, color: "text-amber-400" },
          { label: "Refunded / Canceled", value: stats.refunded, color: "text-rose-400" },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg"
          >
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              {c.label}
            </span>
            <span className={`text-2xl font-mono font-bold mt-1 block ${c.color}`}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                filter === f.id
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  : "bg-slate-900/50 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service, number, country, code…"
            className="w-full pl-10 pr-4 py-2.5 bg-[#0b1120] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table / list */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Records
          </span>
          <span className="text-[11px] text-slate-500">
            {filtered.length} shown
            {filtered.length !== rows.length ? ` · filtered from ${rows.length}` : ""}
          </span>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading history…</span>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="py-16 text-center px-6">
            <p className="text-sm font-semibold text-slate-300">No records yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Purchases and refunds will appear here automatically.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-4 py-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            >
              Buy a number
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-gray-800/80">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Service</div>
              <div className="col-span-1">Country</div>
              <div className="col-span-3">Number</div>
              <div className="col-span-1">Code</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-1 text-right">Copy</div>
            </div>

            <ul className="divide-y divide-gray-800/70">
              {pageRows.map((r) => {
                const when = formatWhen(r.created_at);
                const st = normalizeStatus(r.status);
                return (
                  <li
                    key={r.id}
                    className="px-4 py-3 hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Mobile card layout */}
                    <div className="md:hidden space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-white uppercase truncate">
                            {r.service_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                            {r.country_code || "—"}
                          </span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${statusStyle(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-white font-bold">
                        {r.phone_number || "—"}
                      </div>
                      {r.sms_code && (
                        <div className="text-xs font-mono text-emerald-400">
                          Code: <span className="font-bold">{r.sms_code}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          {when.date} · {when.time}
                        </span>
                        <span className="font-mono text-slate-300">${r.price_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {r.phone_number && (
                          <button
                            type="button"
                            onClick={() => copyText(`${r.id}-phone`, r.phone_number)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
                          >
                            {copiedId === `${r.id}-phone` ? "Copied" : "Copy number"}
                          </button>
                        )}
                        {r.sms_code && (
                          <button
                            type="button"
                            onClick={() => copyText(`${r.id}-code`, r.sms_code!)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          >
                            {copiedId === `${r.id}-code` ? "Copied" : "Copy code"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 text-[11px] text-slate-400">
                        <div className="text-slate-200 font-medium">{when.date}</div>
                        <div className="text-slate-500">{when.time}</div>
                      </div>
                      <div className="col-span-2 text-xs font-bold text-white uppercase truncate">
                        {r.service_name}
                      </div>
                      <div className="col-span-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                          {r.country_code || "—"}
                        </span>
                      </div>
                      <div className="col-span-3 font-mono text-xs text-slate-200 truncate">
                        {r.phone_number || "—"}
                      </div>
                      <div className="col-span-1 font-mono text-xs text-emerald-400 font-bold">
                        {r.sms_code || (st === "pending" ? "…" : "—")}
                      </div>
                      <div className="col-span-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${statusStyle(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      <div className="col-span-1 text-right font-mono text-xs text-slate-300">
                        ${r.price_usd.toFixed(2)}
                      </div>
                      <div className="col-span-1 flex justify-end gap-1">
                        {r.phone_number && (
                          <button
                            type="button"
                            title="Copy number"
                            onClick={() => copyText(`${r.id}-phone`, r.phone_number)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center"
                          >
                            {copiedId === `${r.id}-phone` ? (
                              <span className="text-[9px] text-emerald-400 font-bold">✓</span>
                            ) : (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        )}
                        {r.sms_code && (
                          <button
                            type="button"
                            title="Copy code"
                            onClick={() => copyText(`${r.id}-code`, r.sms_code!)}
                            className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-[9px] font-bold"
                          >
                            {copiedId === `${r.id}-code` ? "✓" : "#"}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={pageSafe <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-slate-500 font-mono">
                  Page {pageSafe + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageSafe >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}