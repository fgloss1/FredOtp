"use client";

import { useEffect, useState } from "react";
import { WalletTopUp } from "@/components/dashboard/WalletTopUp";

export function WalletModalTrigger({
  balanceCents,
  mode = "wallet",
  label,
  className,
}: {
  balanceCents: number;
  mode?: "wallet" | "topup";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const triggerLabel = label ?? (mode === "topup" ? "Top up" : "Wallet");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-ink-950 shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink-950/95 px-5 py-4 backdrop-blur-xl sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
                  Nava Wallet
                </p>
                <h2 id="wallet-modal-title" className="text-xl font-black text-white">
                  {mode === "topup" ? "Add funds" : "Wallet"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close wallet"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <WalletTopUp balanceCents={balanceCents} />
              <div className="mt-4 text-center">
                <a
                  href="/dashboard/wallet"
                  className="text-xs font-semibold text-slate-400 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  View full transaction history
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
