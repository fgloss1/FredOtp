"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminRentalsDesk() {
  const [pendingCrypto, setPendingCrypto] = useState<any[]>([]);
  const [pendingEsims, setPendingEsims] = useState<any[]>([]);
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cryptoRecoveryReports, setCryptoRecoveryReports] = useState<any[]>([]);
  const [recoveryActionId, setRecoveryActionId] = useState<string | null>(null);

  // eSIM Modal State
  const [selectedEsim, setSelectedEsim] = useState<any | null>(null);
  const [assignedNumber, setAssignedNumber] = useState("");
  const [smdpAddress, setSmdpAddress] = useState("sm-dp.t-mobile.com");
  const [activationCode, setActivationCode] = useState("");
  const [isFulfilling, setIsFulfilling] = useState(false);

  // Manual Customer Balance Top-Up State
  const [supportEmail, setSupportEmail] = useState("");
  const [supportAmountUsd, setSupportAmountUsd] = useState<number>(5);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch pending crypto deposits
    const { data: txs } = await supabase
      .from("transactions")
      .select("*, profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // 2. Fetch 30-day eSIM rentals
    const { data: esims } = await supabase
      .from("esim_rentals")
      .select("*")
      .order("created_at", { ascending: false });

    // 3. Fetch active SMS orders across platform
    const { data: orders } = await supabase
      .from("orders")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (txs) setPendingCrypto(txs);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      try {
        const recoveryRes = await fetch("/api/admin/crypto-recovery", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (recoveryRes.ok) {
          const recoveryData = await recoveryRes.json();
          setCryptoRecoveryReports(recoveryData.reports || []);
        }
      } catch {
        // Keep the rest of the administrator desk usable if the recovery queue fails.
      }
    }

    if (esims) setPendingEsims(esims);
    if (orders) setActiveRentals(orders);
    setLoading(false);
  };

  const handleApproveCrypto = async (txId: string) => {
    setApprovingId(txId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Admin session expired. Please log in again.");
      }

      const res = await fetch("/api/admin/approve-crypto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Deposit approved & user wallet credited!");
        fetchData();
      } else {
        alert(data.error || "Failed to approve deposit");
      }
    } catch (err: any) {
      alert("Error approving deposit");
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveCryptoRecovery = async (report: any) => {
    const defaultAmount =
      report.claimed_amount_usd !== null && report.claimed_amount_usd !== undefined
        ? String(Number(report.claimed_amount_usd).toFixed(2))
        : "";

    const verifiedAmountInput = window.prompt(
      "Enter the verified on-chain amount in USD:",
      defaultAmount
    );

    if (verifiedAmountInput === null) return;

    const verifiedAmountUsd = Number(verifiedAmountInput);
    if (!Number.isFinite(verifiedAmountUsd) || verifiedAmountUsd <= 0) {
      alert("Enter a valid verified amount.");
      return;
    }

    const verificationNotes = window.prompt(
      "Describe the blockchain verification you performed:"
    );

    if (verificationNotes === null || !verificationNotes.trim()) return;

    const verifiedTimestampInput = window.prompt(
      "Optional: enter the verified blockchain timestamp as ISO 8601 (leave blank if not available):"
    );

    setRecoveryActionId(report.id);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Admin session expired. Please log in again.");
      }

      const res = await fetch("/api/admin/crypto-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "approve",
          recoveryId: report.id,
          verifiedAmountUsd,
          verifiedBlockTimestamp: verifiedTimestampInput?.trim() || undefined,
          verificationNotes: verificationNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to approve crypto recovery.");
      }

      alert("Crypto recovery approved and customer wallet credited.");
      fetchData();
    } catch (err: any) {
      alert(err?.message || "Error approving crypto recovery.");
    } finally {
      setRecoveryActionId(null);
    }
  };

  const handleRejectCryptoRecovery = async (reportId: string) => {
    const reason = window.prompt(
      "Reason for rejecting this crypto payment report:"
    );

    if (reason === null) return;

    setRecoveryActionId(reportId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Admin session expired. Please log in again.");
      }

      const res = await fetch("/api/admin/crypto-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "reject",
          recoveryId: reportId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to reject crypto recovery.");
      }

      alert("Crypto payment report rejected.");
      fetchData();
    } catch (err: any) {
      alert(err?.message || "Error rejecting crypto recovery.");
    } finally {
      setRecoveryActionId(null);
    }
  };

  const handleFulfillEsim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEsim) return;
    setIsFulfilling(true);

    try {
      const { error } = await supabase
        .from("esim_rentals")
        .update({
          assigned_number: assignedNumber,
          smdp_address: smdpAddress,
          activation_code: activationCode,
          status: "active",
        })
        .eq("id", selectedEsim.id);

      if (error) throw error;
      alert("30-Day eSIM fulfilled and marked active!");
      setSelectedEsim(null);
      fetchData();
    } catch (err: any) {
      alert("Fulfillment failed: " + err.message);
    } finally {
      setIsFulfilling(false);
    }
  };

  const handleManualUserCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmail || supportAmountUsd <= 0) return;
    setIsTopUpLoading(true);

    try {
      // Find profile by email
      const { data: prof, error: findErr } = await supabase
        .from("profiles")
        .select("id, balance")
        .eq("email", supportEmail.trim())
        .single();

      if (findErr || !prof) {
        alert("User email not found in profiles table");
        setIsTopUpLoading(false);
        return;
      }

      const newBal = Number((Number(prof.balance) + Number(supportAmountUsd)).toFixed(2));

      await supabase.from("profiles").update({ balance: newBal }).eq("id", prof.id);

      // Record transaction log
      await supabase.from("transactions").insert({
        user_id: prof.id,
        amount_usd: supportAmountUsd,
        amount_local: supportAmountUsd * 1500,
        currency: "USD",
        payment_method: "Admin Manual Credit",
        reference: `ADMIN-GRANT-${Date.now()}`,
        status: "completed",
      });

      alert(`Successfully credited $${supportAmountUsd.toFixed(2)} to ${supportEmail}`);
      setSupportEmail("");
      fetchData();
    } catch (err: any) {
      alert("Error adding balance: " + err.message);
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const getExplorerUrl = (method: string, hash: string) => {
    if (method.includes("BTC")) return `https://www.blockchain.com/explorer/transactions/btc/${hash}`;
    if (method.includes("LTC")) return `https://blockchair.com/litecoin/transaction/${hash}`;
    return `https://tronscan.org/#/transaction/${hash}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <span>🛠️ Administrator Desk</span>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">LIVE ADMIN CONTROL</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Manage crypto approvals, eSIM fulfillments, user balances, and live rental streams.</p>
        </div>
        <button onClick={fetchData} className="bg-[#152035] border border-slate-700 hover:bg-slate-800 text-emerald-400 text-xs px-3.5 py-2 rounded-xl font-bold transition-all">
          🔄 Refresh Desk Data
        </button>
      </div>

      {/* Financial Metrics Shelf */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">30-Day eSIM Resale</span>
          <div className="text-2xl font-black text-white mt-1">$30.00 <span className="text-xs text-gray-400">/ line</span></div>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tello Wholesale Cost</span>
          <div className="text-2xl font-black text-red-400 mt-1">$7.05 <span className="text-xs text-gray-400">/ line</span></div>
        </div>
        <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-5 bg-emerald-500/5 shadow">
          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Net Profit Margin</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">$22.95 <span className="text-xs text-emerald-500/70 font-normal">(+325%)</span></div>
        </div>
      </div>

      {/* Pending Crypto Deposit Approvals */}
      <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🪙 Pending Crypto Deposits</span>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">{pendingCrypto.length}</span>
          </h2>
        </div>

        {pendingCrypto.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No pending crypto deposits awaiting approval.</p>
        ) : (
          <div className="space-y-3">
            {pendingCrypto.map((tx) => (
              <div key={tx.id} className="bg-[#152035] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">{tx.profiles?.email || "User"}</div>
                  <div className="text-xs text-emerald-400 font-bold">${Number(tx.amount_usd).toFixed(2)} USD ({tx.payment_method})</div>
                  <div className="text-[11px] text-gray-400 font-mono truncate max-w-md">
                    TxHash: {tx.reference}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getExplorerUrl(tx.payment_method, tx.reference)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs px-3 py-2 rounded-xl font-bold transition-all"
                  >
                    Verify Blockchain ↗
                  </a>
                  <button
                    onClick={() => handleApproveCrypto(tx.id)}
                    disabled={approvingId === tx.id}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs px-4 py-2 rounded-xl font-black transition-all shadow"
                  >
                    {approvingId === tx.id ? "Crediting..." : "Approve & Credit"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crypto Payment Recovery Queue */}
      <div className="bg-[#0d1526] border border-amber-500/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛟 Crypto Payment Recovery</span>
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                \${cryptoRecoveryReports.length}
              </span>
            </h2>
            <p className="text-[11px] text-gray-500 mt-1">
              Exceptional late, duplicate, or unmatched payments. Verify on-chain before approving.
            </p>
          </div>
        </div>

        {cryptoRecoveryReports.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No crypto payment recovery reports awaiting review.</p>
        ) : (
          <div className="space-y-3">
            {cryptoRecoveryReports.map((report) => {
              const intent = Array.isArray(report.deposit_intents)
                ? report.deposit_intents[0]
                : report.deposit_intents;

              return (
                <div
                  key={report.id}
                  className="bg-[#152035] border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        {report.user_email || "Customer"}
                      </div>
                      <div className="text-xs text-amber-300 font-bold">
                        {report.coin} / {report.network} • Claimed $
                        {report.claimed_amount_usd === null || report.claimed_amount_usd === undefined
                          ? "—"
                          : Number(report.claimed_amount_usd).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Reason: {String(report.reason || "").replaceAll("_", " ")}
                      </div>
                      {intent && (
                        <div className="text-[10px] text-gray-500">
                          Session: {intent.status} • Expected \${Number(intent.expected_amount_usd).toFixed(2)}
                          {intent.expires_at ? \` • Expires \${new Date(intent.expires_at).toLocaleString()}\` : ""}
                        </div>
                      )}
                      {report.notes && (
                        <div className="text-[10px] text-gray-400 max-w-2xl">
                          Customer note: {report.notes}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-400 font-mono break-all">
                        TxHash: {report.tx_hash}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 whitespace-nowrap">
                      Reported {new Date(report.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={getExplorerUrl(report.coin, report.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs px-3 py-2 rounded-xl font-bold transition-all"
                    >
                      Verify Blockchain ↗
                    </a>
                    <button
                      onClick={() => handleApproveCryptoRecovery(report)}
                      disabled={recoveryActionId === report.id}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs px-4 py-2 rounded-xl font-black transition-all shadow disabled:opacity-50"
                    >
                      {recoveryActionId === report.id ? "Processing..." : "Verify & Credit"}
                    </button>
                    <button
                      onClick={() => handleRejectCryptoRecovery(report.id)}
                      disabled={recoveryActionId === report.id}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      Reject Report
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dedicated 30-Day eSIM Orders */}
      <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>📲 30-Day Dedicated eSIM Line Requests</span>
          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">{pendingEsims.length}</span>
        </h2>

        {pendingEsims.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No eSIM orders recorded.</p>
        ) : (
          <div className="space-y-3">
            {pendingEsims.map((esim) => (
              <div key={esim.id} className="bg-[#152035] border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{esim.customer_name} ({esim.customer_email})</div>
                  <div className="text-[11px] text-gray-400">{esim.carrier_plan} • Assigned: <strong className="text-emerald-400">{esim.assigned_number || "Awaiting Setup"}</strong></div>
                </div>
                <div>
                  {esim.status === "pending" ? (
                    <button
                      onClick={() => setSelectedEsim(esim)}
                      className="bg-amber-500 hover:bg-amber-400 text-black text-xs px-3.5 py-2 rounded-xl font-bold shadow transition-all"
                    >
                      Fulfill eSIM
                    </button>
                  ) : (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl font-bold">Active Line</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual User Balance Grant (Support Tool) */}
      <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>💳 Manual Customer Support Top-Up</span>
        </h2>
        <form onSubmit={handleManualUserCredit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="email"
            placeholder="Customer Email..."
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            required
          />
          <input
            type="number"
            min="1"
            value={supportAmountUsd}
            onChange={(e) => setSupportAmountUsd(Number(e.target.value))}
            className="bg-[#152035] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            required
          />
          <button
            type="submit"
            disabled={isTopUpLoading}
            className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl py-2.5 transition-all shadow"
          >
            {isTopUpLoading ? "Granting..." : "Grant Wallet Credit"}
          </button>
        </form>
      </div>

      {/* Active Platform Rentals Audit */}
      <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white">📑 Recent Platform Rentals Log</h2>
        {activeRentals.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No standard OTP rental records found.</p>
        ) : (
          <div className="space-y-2">
            {activeRentals.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-[#152035] rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-white block">{r.service_name} ({r.country_code})</span>
                  <span className="text-[10px] text-gray-400 font-mono">{r.phone_number || "Pending number"} • {r.profiles?.email || "User"}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 block">${Number(r.price_usd).toFixed(2)}</span>
                  <span className="text-[10px] text-gray-400 uppercase font-mono">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* eSIM Fulfillment Modal */}
      {selectedEsim && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Fulfill 30-Day eSIM Rental</h3>
            <form onSubmit={handleFulfillEsim} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Assigned US Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={assignedNumber}
                  onChange={(e) => setAssignedNumber(e.target.value)}
                  className="w-full bg-[#152035] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">SM-DP+ Address</label>
                <input
                  type="text"
                  value={smdpAddress}
                  onChange={(e) => setSmdpAddress(e.target.value)}
                  className="w-full bg-[#152035] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Activation Code / Matching ID</label>
                <input
                  type="text"
                  placeholder="TEST-ACTIVATION-CODE-123"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="w-full bg-[#152035] border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setSelectedEsim(null)} className="px-4 py-2 text-xs text-gray-400">Cancel</button>
                <button type="submit" disabled={isFulfilling} className="bg-emerald-500 text-black font-bold text-xs px-4 py-2 rounded-xl">
                  {isFulfilling ? "Saving..." : "Activate & Send Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}