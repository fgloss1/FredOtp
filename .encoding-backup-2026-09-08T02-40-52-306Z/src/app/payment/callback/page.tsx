"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usd } from "@/lib/format";

function PaymentCallbackContentPage() {
  const params = useSearchParams();
  const reference = params.get("reference");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your payment securely…");
  const [amountCents, setAmountCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!reference) {
        setState("error");
        setMessage("No payment reference was provided.");
        return;
      }

      try {
        const response = await fetch(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          ok?: boolean;
          amountCents?: number;
          bonusCents?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setState("error");
          setMessage(data.error ?? "We could not confirm this payment yet.");
          return;
        }

        setAmountCents((data.amountCents ?? 0) + (data.bonusCents ?? 0));
        setState("success");
        setMessage("Payment confirmed. Your wallet has been updated.");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("We could not reach the payment service. Check your wallet shortly.");
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-lg">
        <div className="card p-7 text-center sm:p-9">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
            {state === "loading" ? "â³" : state === "success" ? "✅" : "⚠️"}
          </div>
          <h1 className="mt-5 text-2xl font-black">
            {state === "loading" ? "Confirming payment" : state === "success" ? "Payment successful" : "Payment check"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
          {amountCents !== null && (
            <p className="mt-4 text-lg font-black text-emerald-300">Wallet value added: {usd(amountCents)}</p>
          )}
          {reference && <p className="mt-4 break-all text-xs text-slate-600">Reference: {reference}</p>}
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/wallet" className="glow-btn flex-1 rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-4 py-3 text-sm font-extrabold text-ink-950">
              Open wallet
            </Link>
            <Link href="/dashboard" className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-200">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense fallback={<div>Loading payment status...</div>}>
      <PaymentCallbackContentPage />
    </Suspense>
  );
}


