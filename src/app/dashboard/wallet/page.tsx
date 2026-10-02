"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { getCryptoWallets } from "@/lib/crypto";

const NGN_RATE = 1500;

export default function WalletPage() {
  const [darkMode, setDarkMode] = useState(true);

  const [balance, setBalance] = useState(0);

  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [copiedCryptoAddress, setCopiedCryptoAddress] = useState(false);
  const cryptoWallets = getCryptoWallets();

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const { supabase } = await import("@/lib/supabase");
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", authData.user.id)
        .single();

      if (profile && profile.balance !== undefined) {
        setBalance(Number(profile.balance));
      }
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const syncCurrency = () => {
      if (typeof window !== "undefined") {
        // Keeps theme/currency sync listeners active
      }
    };
    syncCurrency();
    window.addEventListener("nava-currency-change", syncCurrency);
    return () => window.removeEventListener("nava-currency-change", syncCurrency);
  }, [fetchProfile]);

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedCryptoAddress(true);
    setTimeout(() => setCopiedCryptoAddress(false), 2000);
  };

  const theme = darkMode
    ? {
        cardBg: "bg-[#111827] border-gray-800",
        textTitle: "text-white",
        textMuted: "text-gray-400",
        textSubtle: "text-gray-500",
        inputBg: "bg-[#1f2937] border-gray-700 text-white focus:border-emerald-500",
        innerCard: "bg-[#1f2937] border-gray-700/60",
      }
    : {
        cardBg: "bg-white border-slate-200 shadow-sm",
        textTitle: "text-slate-900",
        textMuted: "text-slate-600 font-semibold",
        textSubtle: "text-slate-500",
        inputBg: "bg-slate-100 border-slate-300 text-slate-900 focus:border-emerald-500",
        innerCard: "bg-slate-50 border-slate-200",
      };

  const currentWallet = cryptoWallets[selectedCrypto];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 min-h-screen">
      {/* Top Header & Balance */}
      <div className={`${theme.cardBg} border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider block ${theme.textMuted}`}>Available Wallet Balance</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`text-3xl sm:text-4xl font-mono font-black ${theme.textTitle}`}>
              ${balance.toFixed(2)}
            </span>
            <span className="text-sm font-mono text-emerald-500 font-bold">
              ≈ ₦{(balance * NGN_RATE).toLocaleString()} NGN
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-xs">
          🛡️ Non-Custodial Automated Wallet Deposit
        </div>
      </div>

      {/* Deposit Methods Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Option 1: Crypto (Exodus non-custodial) - Primary Active Method */}
        <div className={`${theme.cardBg} border rounded-3xl p-6 space-y-6 shadow-lg relative overflow-hidden`}>
          <div className="flex items-center justify-between border-b pb-4 border-gray-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg">
                ⚡
              </div>
              <div>
                <h2 className={`font-bold text-base ${theme.textTitle}`}>Exodus Crypto Deposit</h2>
                <p className={`text-xs ${theme.textSubtle}`}>Instant Deposit · Zero Platform Fees</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold uppercase tracking-wide">
              Active
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {cryptoWallets.map((wallet, idx) => (
                <button
                  key={wallet.symbol}
                  type="button"
                  onClick={() => {
                    setSelectedCrypto(idx);
                    setCopiedCryptoAddress(false);
                  }}
                  className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                    selectedCrypto === idx
                      ? "bg-blue-500/10 border-blue-500 text-blue-400 font-bold shadow-md shadow-blue-500/10"
                      : `${theme.innerCard} ${theme.textMuted}`
                  }`}
                >
                  <img src={wallet.icon} alt={wallet.coin} className="w-5 h-5 mx-auto mb-1 object-contain" />
                  <span className="text-[11px] block">{wallet.symbol}</span>
                </button>
              ))}
            </div>

            {currentWallet && (
              <div className={`${theme.innerCard} p-5 rounded-2xl border text-center space-y-4`}>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                  {currentWallet.network}
                </span>

                {currentWallet.qr ? (
                  <img
                    src={currentWallet.qr}
                    alt={`${currentWallet.symbol} QR Code`}
                    className="w-36 h-32 mx-auto rounded-xl border border-gray-700 bg-white p-1.5 shadow-md object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-xl border border-gray-700 bg-slate-900/50 flex items-center justify-center text-xs text-gray-500">
                    No QR Available
                  </div>
                )}

                <div className="bg-[#090e1a] p-3.5 rounded-2xl border border-gray-800 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Deposit Address ({currentWallet.symbol})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(currentWallet.address)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black transition cursor-pointer border border-emerald-500/30"
                    >
                      {copiedCryptoAddress ? "Copied! ✓" : "Copy Address"}
                    </button>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400 break-all bg-black/40 p-2.5 rounded-xl border border-slate-800">
                    {currentWallet.address || "Address configuration pending..."}
                  </div>
                </div>

                <p className={`text-[10px] leading-relaxed ${theme.textSubtle}`}>
                  Send strictly via <strong>{currentWallet.network}</strong>. Balance is automatically credited upon block confirmation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Option 2: Local Bank & Card Payments - HELD AS COMING SOON FOR PRIVACY */}
        <div className={`${theme.cardBg} border rounded-3xl p-6 space-y-6 shadow-lg relative opacity-90`}>
          <div className="flex items-center justify-between border-b pb-4 border-gray-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">
                💳
              </div>
              <div>
                <h2 className={`font-bold text-base ${theme.textTitle}`}>Cards & Local Bank Transfers</h2>
                <p className={`text-xs ${theme.textSubtle}`}>Instant USD Top-Up Node</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
              Coming Soon
            </span>
          </div>

          <div className="space-y-5 py-4">
            <div className={`${theme.innerCard} p-6 rounded-2xl border space-y-3 text-center`}>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-xl mx-auto">
                🚧
              </div>
              <h3 className={`text-sm font-bold ${theme.textTitle}`}>Global Card Processing Upgrade</h3>
              <p className={`text-xs leading-relaxed ${theme.textSubtle}`}>
                We are integrating high-speed global card payment gateways and multi-currency bank transfer nodes to provide seamless direct USD checkout.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs space-y-1.5">
              <span className="font-bold text-blue-400 block">💡 Preferred Deposit Method:</span>
              <p className={theme.textSubtle}>
                Please use <strong>USDT (TRX)</strong>, <strong>Bitcoin</strong>, or <strong>Litecoin</strong> for instant 24/7 automated wallet top-ups.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="w-full py-4 rounded-2xl bg-slate-800/80 text-gray-500 border border-slate-700/50 font-bold text-xs cursor-not-allowed uppercase tracking-wider"
            >
              Direct Card Checkout (Under Upgrade)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}