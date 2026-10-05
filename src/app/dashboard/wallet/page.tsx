"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { CRYPTO_RATES, calculateCryptoAmount, formatCryptoAmount } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

const NGN_RATE = 1500;
const AMOUNT_PRESETS = [10, 50, 100, 250, 500];

interface CryptoWallet {
  coin: string;
  symbol: string;
  address: string;
  network: string;
  rateUSD: number;
  autoCredit: boolean;
  icon: string; // ADD THIS LINE
}

export default function WalletPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [balance, setBalance] = useState(0);
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [copiedCryptoAddress, setCopiedCryptoAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");
  const [depositError, setDepositError] = useState("");

  // Fetch wallets from server (authoritative addresses)
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const currentWallet = cryptoWallets[selectedCrypto];

  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");

      const warningDismissed = localStorage.getItem("nava-security-warning-dismissed");
      setShowWarning(!warningDismissed);
    }
  }, []);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const res = await fetch("/api/crypto/wallets");
        const data = await res.json();
        setCryptoWallets(data.wallets || []);
      } catch (err) {
        console.error("Failed to fetch crypto wallets:", err);
      }
    };
    fetchWallets();
  }, []);

  const fetchProfile = useCallback(async () => {
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
  }, [fetchProfile]);

  const handleDismissWarning = () => {
    setShowWarning(false);
    localStorage.setItem("nava-security-warning-dismissed", "true");
  };

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedCryptoAddress(true);
    setTimeout(() => setCopiedCryptoAddress(false), 2000);
  };

  const handlePresetAmount = (amount: number) => {
    setDepositAmount(amount.toString());
    setIsCustomAmount(false);
  };

  const handleCustomAmount = () => {
    setIsCustomAmount(true);
    setDepositAmount("");
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setDepositMessage("");
    setDepositError("");

    if (!depositAmount || Number(depositAmount) <= 0) {
      setDepositError("Please enter a valid deposit amount.");
      setIsSubmitting(false);
      return;
    }
    if (!txHash || txHash.length < 10) {
      setDepositError("Please enter a valid Transaction Hash (TxHash).");
      setIsSubmitting(false);
      return;
    }

    try {
      // Get auth token from Supabase session
      const { data: authData } = await supabase.auth.getSession();
      const accessToken = authData?.session?.access_token;

      if (!accessToken) {
        setDepositError("Session expired. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      const coinName = currentWallet ? currentWallet.symbol : "UNKNOWN";

      const res = await fetch("/api/crypto/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amountUsd: Number(depositAmount),
          coin: coinName,
          txHash: txHash.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Deposit submission failed");
      }

      setDepositMessage(data.message || "Deposit submitted successfully!");
      setDepositAmount("");
      setTxHash("");
      setShowQR(false);

      if (data.autoCredited) {
        setBalance(data.newBalance || balance);
      }

      setTimeout(() => fetchProfile(), 2000);

    } catch (err: any) {
      setDepositError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cryptoAmount = currentWallet && depositAmount
    ? calculateCryptoAmount(Number(depositAmount), currentWallet.rateUSD)
    : 0;

  const theme = darkMode
    ? {
        cardBg: "bg-[#111827] border-2 border-gray-700 shadow-xl",
        textTitle: "text-white",
        textMuted: "text-gray-400",
        textSubtle: "text-gray-500",
        inputBg: "bg-[#1f2937] border-2 border-gray-600 text-white focus:border-emerald-500",
        innerCard: "bg-[#1f2937] border-2 border-gray-600",
        divider: "border-gray-700",
        addressBg: "bg-emerald-900/20 border-emerald-700/50",
        warningBg: "bg-red-900/20 border-red-700/50",
      }
    : {
        cardBg: "bg-white border-2 border-slate-300 shadow-xl",
        textTitle: "text-slate-900",
        textMuted: "text-slate-600 font-semibold",
        textSubtle: "text-slate-500",
        inputBg: "bg-slate-50 border-2 border-slate-300 text-slate-900 focus:border-emerald-500",
        innerCard: "bg-slate-50 border-2 border-slate-300",
        divider: "border-slate-200",
        addressBg: "bg-emerald-50 border-emerald-300",
        warningBg: "bg-red-50 border-red-300",
      };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen">

      {/* SECURITY WARNING BANNER */}
      {showWarning && (
        <div className={`${theme.warningBg} border-2 rounded-2xl p-4 flex items-start justify-between gap-4`}>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-600 mb-1">⚠️ Do not share your BTC/LTC/USDT addresses with anyone!</h3>
            <p className="text-xs text-red-500">Don't send a screenshot of this page to anyone! Otherwise you might lose your account!</p>
            <p className="text-xs text-red-400 mt-1">
              To hide this alert please enable <span className="underline cursor-pointer">2-step Verification</span> or link Telegram
            </p>
          </div>
          <button onClick={handleDismissWarning} className="text-red-400 hover:text-red-600 text-xl font-bold">×</button>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT PANEL (2/3 width) - Main Deposit Flow */}
        <div className="lg:col-span-2 space-y-6">

          {/* Balance & Amount Presets */}
          <div className={`${theme.cardBg} rounded-3xl p-6`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider block ${theme.textMuted}`}>Available Wallet Balance</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className={`text-3xl sm:text-4xl font-mono font-black ${theme.textTitle}`}>${balance.toFixed(2)}</span>
                  <span className="text-sm font-mono text-emerald-500 font-bold">≈ ₦{(balance * NGN_RATE).toLocaleString()} NGN</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 font-bold text-xs">
                🛡️ Non-Custodial Automated Wallet Deposit
              </div>
            </div>

            {/* Amount Presets */}
            <div>
              <label className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted} block mb-2`}>Select amount:</label>
              <div className="flex flex-wrap gap-2">
                {AMOUNT_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handlePresetAmount(amount)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      depositAmount === amount.toString() && !isCustomAmount
                        ? "bg-emerald-500 text-black"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleCustomAmount}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    isCustomAmount
                      ? "bg-emerald-500 text-black border-emerald-500"
                      : "bg-transparent text-blue-500 border-blue-500 hover:bg-blue-500/10"
                  }`}
                >
                  {isCustomAmount ? "Custom Amount" : "Other amount"}
                </button>
              </div>
            </div>
          </div>

          {/* Crypto Deposit Card */}
          <div className={`${theme.cardBg} rounded-3xl p-6 space-y-6`}>
            {/* Crypto Selector */}
<div className="grid grid-cols-3 gap-3">
  {cryptoWallets.map((wallet, idx) => (
    <button
      key={wallet.symbol}
      type="button"
      onClick={() => {
        setSelectedCrypto(idx);
        setCopiedCryptoAddress(false);
        setShowQR(false);
        setDepositMessage("");
        setDepositError("");
      }}
      className={`p-4 rounded-2xl border-2 text-center transition-all ${
        selectedCrypto === idx
          ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20"
          : `${theme.innerCard} ${theme.textMuted} hover:border-gray-500`
      }`}
    >
      {/* FIXED: Use wallet.icon from API */}
      <img src={wallet.icon} alt={wallet.coin} className="w-8 h-8 mx-auto mb-2 object-contain" />
      <span className="text-sm font-bold block">{wallet.symbol}</span>
      <span className="text-[10px] text-gray-500">{wallet.network.split(" ")[0]}</span>
    </button>
  ))}
</div>

            {currentWallet && (
              <div className="space-y-6">
                {/* BTC/LTC Manual Verification Warning */}
                {!currentWallet.autoCredit && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-400 text-xs font-bold">
                    ⚠️ {currentWallet.symbol} deposits require manual admin verification (15-60 minutes). You will be credited after approval.
                  </div>
                )}

                {/* Crypto Amount Display */}
                {depositAmount && cryptoAmount > 0 && (
                  <div className={`${theme.addressBg} border-2 rounded-2xl p-4`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs ${theme.textMuted} mb-1`}>You send:</p>
                        <p className={`text-xl font-mono font-black ${theme.textTitle}`}>
                          {formatCryptoAmount(cryptoAmount, currentWallet.symbol)} {currentWallet.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs ${theme.textMuted}`}>Exchange Rate:</p>
                        <p className={`text-xs font-mono font-bold ${theme.textTitle}`}>
                          1 {currentWallet.symbol} = ${currentWallet.rateUSD.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Box */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-bold ${theme.textTitle}`}>
                      Send {depositAmount && cryptoAmount > 0 ? `${formatCryptoAmount(cryptoAmount, currentWallet.symbol)} ${currentWallet.symbol}` : currentWallet.symbol} to your {currentWallet.coin} topup address
                    </h3>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setShowQR(!showQR)} className="text-xs text-blue-500 hover:underline font-bold">
                        {showQR ? "hide QR" : "show QR"}
                      </button>
                      <a href={`${currentWallet.symbol === 'USDT' ? 'https://tronscan.org/#/transaction/' : currentWallet.symbol === 'BTC' ? 'https://www.blockchain.com/explorer/transactions/btc/' : 'https://blockchair.com/litecoin/transaction/'}${currentWallet.address}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline font-bold">
                        view my transactions online
                      </a>
                    </div>
                  </div>

                  {showQR && (
                    <div className="mb-4 text-center">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentWallet.address)}`} alt={`${currentWallet.symbol} QR Code`} className="w-40 h-40 mx-auto rounded-xl border-2 border-gray-600 bg-white p-2 shadow-lg" />
                    </div>
                  )}

                  <div className={`${theme.addressBg} border-2 rounded-xl p-3 flex items-center justify-between gap-3`}>
                    <code className={`text-xs font-mono font-bold break-all ${theme.textTitle}`}>{currentWallet.address || "Address configuration pending..."}</code>
                    <button type="button" onClick={() => handleCopyAddress(currentWallet.address)} className={`flex-shrink-0 p-2 rounded-lg ${copiedCryptoAddress ? "bg-emerald-500 text-black" : "bg-emerald-500/20 text-emerald-500"} hover:bg-emerald-500 hover:text-black transition`}>
                      {copiedCryptoAddress ? "✓" : "📋"}
                    </button>
                  </div>

                  {copiedCryptoAddress && <p className="text-xs text-emerald-500 font-bold mt-1">Address copied to clipboard!</p>}
                </div>

                {/* TxHash Submission Form */}
                <div className={`pt-6 border-t-2 ${theme.divider}`}>
                  <h3 className={`text-sm font-bold ${theme.textTitle} mb-4`}>Confirm Your Deposit</h3>
                  <form onSubmit={handleDepositSubmit} className="space-y-4">
                    <div>
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} block mb-1`}>USD Amount to Deposit</label>
                      <input type="number" step="0.01" min="1" placeholder="e.g. 50.00" value={depositAmount} onChange={(e) => { setDepositAmount(e.target.value); setIsCustomAmount(true); }} className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition ${theme.inputBg}`} disabled={isSubmitting} />
                    </div>

                    <div>
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${theme.textMuted} block mb-1`}>Transaction ID (TxHash)</label>
                      <input type="text" placeholder="Paste transaction hash from blockchain explorer after sending" value={txHash} onChange={(e) => setTxHash(e.target.value)} className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition ${theme.inputBg}`} disabled={isSubmitting} />
                    </div>

                    {depositMessage && (<div className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 text-xs font-bold">{depositMessage}</div>)}
                    {depositError && (<div className="p-3 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-400 text-xs font-bold">{depositError}</div>)}

                    <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? "⏳ Verifying on Blockchain..." : "✅ Submit Deposit"}
                    </button>

                    <p className={`text-[10px] ${theme.textSubtle} text-center`}>
                      Auto-credit if verified on-chain (USDT only). Otherwise pending admin review. Do not close this page until submission is complete.
                    </p>
                  </form>
                </div>

                {/* Exchange Rates Footer */}
                <div className={`pt-4 border-t-2 ${theme.divider}`}>
                  <p className={`text-[10px] ${theme.textMuted} text-center`}>
                    Current Rates: 1 BTC = ${CRYPTO_RATES.BTC.toLocaleString()} | 1 LTC = ${CRYPTO_RATES.LTC.toLocaleString()} | 1 USDT = ${CRYPTO_RATES.USDT.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (1/3 width) - Cards & Bank */}
        <div className="lg:col-span-1">
          <div className={`${theme.cardBg} rounded-3xl p-6 sticky top-8`}>
            <div className={`flex items-center justify-between border-b-2 pb-4 ${theme.divider}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center text-lg">💳</div>
                <div>
                  <h2 className={`font-bold text-base ${theme.textTitle}`}>Cards & Bank</h2>
                  <p className={`text-xs ${theme.textSubtle}`}>Instant USD Top-Up</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border-2 border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Coming Soon</span>
            </div>

            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mx-auto">
                🚧
              </div>
              <div>
                <h3 className={`text-sm font-bold ${theme.textTitle} mb-2`}>Global Card Processing Upgrade</h3>
                <p className={`text-xs leading-relaxed ${theme.textSubtle}`}>
                  We are integrating high-speed global card payment gateways and multi-currency bank transfer nodes to provide seamless direct USD checkout.
                </p>
              </div>
              <div className={`p-4 rounded-2xl bg-blue-500/5 border-2 border-blue-500/20 text-xs space-y-2`}>
                <span className="font-bold text-blue-400 block">💡 Preferred Method:</span>
                <p className={theme.textSubtle}>
                  Use <strong>USDT (TRX)</strong>, <strong>Bitcoin</strong>, or <strong>Litecoin</strong> for instant 24/7 automated wallet top-ups.
                </p>
              </div>
              <button type="button" disabled className="w-full py-3 rounded-2xl bg-slate-800/80 text-gray-500 border-2 border-slate-700/50 font-bold text-xs cursor-not-allowed uppercase tracking-wider">
                Direct Card Checkout (Under Upgrade)
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}