"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        className="w-full max-w-xl origin-center animate-[walletPop_220ms_cubic-bezier(.2,.8,.2,1)] overflow-hidden rounded-3xl border border-white/10 bg-ink-950 shadow-[0_30px_100px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">
              Nava Wallet
            </p>
            <h2 id="wallet-modal-title" className="mt-1 text-xl font-black text-white">
              {mode === "topup" ? "Add funds" : "Wallet"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close wallet"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-xl leading-none text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
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

      <style jsx>{`
        @keyframes walletPop {
          from {
            opacity: 0;
            transform: scale(0.84) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {triggerLabel}
      </button>
      {mounted && typeof document !== "undefined" && modal
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
