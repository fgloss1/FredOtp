"use client";

import { useState } from "react";
import { ngn, usd } from "@/lib/format";

const PRESETS = [500, 1000, 2500, 5000, 10000, 20000];

const METHODS: { id: string; label: string; icon: string; hint: string }[] = [
  { id: "card", label: "Card", icon: "💳", hint: "Visa · Mastercard · Verve" },
  { id: "transfer", label: "Bank transfer", icon: "🏦", hint: "Nigerian bank transfer" },
  { id: "ussd", label: "USSD", icon: "📲", hint: "Supported Nigerian banks" },
];

export function WalletTopUp({
  balanceCents,
  defaultAmount,
}: {
  balanceCents: number;
  defaultAmount?: number;
}) {
  const [amount, setAmount] = useState<number>(
    defaultAmount && defaultAmount >= 200 ? defaultAmount : 2500,
  );
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(balanceCents);

  const bonus = amount >= 5000 ? Math.round(amount * 0.1) : 0;

  async function topUp() {
    if (!Number.isFinite(amount) || amount < 200 || amount > 100000) {
      setError("Enter an amount between $2 and $1,000.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: amount, method }),
      });
      const data = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.authorizationUrl) {
        setError(data.error ?? "Could not start payment.");
        setBusy(false);
        return;
      }

      setMessage("Redirecting you to secure payment checkout…");
      window.location.assign(data.authorizationUrl);
    } catch {
      setError("Could not reach the payment service.");
      setBusy(false);
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Top up wallet</h2>
          <p className="text-sm text-slate-500">Credit never expires · 10% bonus from $50</p>
        </div>
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
            Balance
          </p>
          <p className="text-lg font-black leading-none text-emerald-300">{usd(balance)}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className={`rounded-xl border px-2 py-3 text-sm font-bold transition ${
              amount === preset
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 text-slate-300 hover:border-white/25"
            }`}
          >
            {usd(preset)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
          Custom amount (USD)
        </label>
        <input
          type="number"
          min={2}
          max={1000}
          step={1}
          value={(amount / 100).toString()}
          onChange={(event) => setAmount(Math.round(Number(event.target.value) * 100))}
          className="w-full rounded-xl border border-white/12 bg-ink-950/70 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-400/60"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          You pay {usd(amount)} ≈ {ngn(amount)}
          {bonus > 0 && (
            <span className="ml-2 font-bold text-emerald-300">+ {usd(bonus)} bonus</span>
          )}
        </p>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {METHODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMethod(item.id)}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
              method === item.id
                ? "border-emerald-400/50 bg-emerald-400/10"
                : "border-white/8 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>
              <span className="block text-sm font-bold text-white">{item.label}</span>
              <span className="block text-[11px] text-slate-500">{item.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          ✅ {message}
        </p>
      )}

      <button
        type="button"
        onClick={topUp}
        disabled={busy}
        className="glow-btn mt-5 w-full rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 py-3.5 text-sm font-extrabold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Processing payment…" : `Add ${usd(amount)} to wallet`}
      </button>
      <p className="mt-3 text-center text-[11px] text-slate-500">
        Secure checkout powered by Paystack. Your wallet is credited only after payment is verified.
      </p>
    </div>
  );
}
