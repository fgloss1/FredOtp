"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type EsimOrder = {
  id: string;
  user_id: string;
  status: string;
  zip_code?: string | null;
  assigned_phone_number?: string | null;
  plan?: { name?: string } | null;
};

export default function AdminEsimOrdersPage() {
  const [orders, setOrders] = useState<EsimOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<EsimOrder | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [customerInstructions, setCustomerInstructions] = useState("");
  const [supplierConfirmation, setSupplierConfirmation] = useState("");
  const [fulfilling, setFulfilling] = useState(false);
  const [actionError, setActionError] = useState("");

  async function getAccessToken() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    return session.access_token;
  }

  async function loadOrders() {
    setLoading(true);
    setLoadError("");
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/esim/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load eSIM orders.");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load eSIM orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function handleFulfill() {
    if (!selectedOrder || !phoneNumber.trim()) {
      setActionError("Enter the assigned phone number before activating this order.");
      return;
    }
    setFulfilling(true);
    setActionError("");
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/esim/admin/orders/${selectedOrder.id}/fulfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assigned_phone_number: phoneNumber.trim(),
          activation_code: activationCode.trim(),
          customer_instructions: customerInstructions.trim(),
          supplier_confirmation: supplierConfirmation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to fulfill order.");
      setSelectedOrder(null);
      setPhoneNumber("");
      setActivationCode("");
      setCustomerInstructions("");
      setSupplierConfirmation("");
      await loadOrders();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to fulfill order.");
    } finally {
      setFulfilling(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 font-sans text-white">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin eSIM Fulfillment Desk</h1>
        <button onClick={() => void loadOrders()} disabled={loading}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">
          Refresh
        </button>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{loadError}</div>}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading orders…</div>
      ) : (
        <div className="space-y-4">
          {orders.length === 0 && !loadError && <p className="text-sm text-slate-400">No eSIM orders found.</p>}
          {orders.map((order) => (
            <section key={order.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0b1120] p-4">
              <div>
                <p className="font-bold text-sm">{order.plan?.name || "eSIM plan"} · User: {order.user_id?.slice(0, 8) || "Unknown"}…</p>
                <p className="mt-1 text-xs text-slate-400">Status: {order.status} · ZIP: {order.zip_code || "N/A"}</p>
                {order.assigned_phone_number && <p className="mt-1 text-xs text-slate-300">Number: {order.assigned_phone_number}</p>}
              </div>
              {order.status === "paid_awaiting_fulfillment" ? (
                <button onClick={() => {
                  setSelectedOrder(order);
                  setPhoneNumber(order.assigned_phone_number || "");
                  setActionError("");
                }} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950">
                  Fulfill Order
                </button>
              ) : (
                <span className="text-xs text-slate-400">Not eligible for fulfillment</span>
              )}
            </section>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="fulfill-title" className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-slate-800 bg-[#0b1120] p-6">
            <h2 id="fulfill-title" className="text-lg font-bold">Fulfill Order: {selectedOrder.plan?.name || selectedOrder.id}</h2>
            {actionError && <div role="alert" className="rounded-xl border border-red-800 p-3 text-sm text-red-200">{actionError}</div>}
            <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Assigned phone number (+1…)" className="w-full rounded-xl border border-slate-800 bg-[#070d19] p-3 text-sm text-white" />
            <textarea value={activationCode} onChange={(event) => setActivationCode(event.target.value)} placeholder="Activation code (optional)" className="h-24 w-full rounded-xl border border-slate-800 bg-[#070d19] p-3 text-sm text-white" />
            <textarea value={customerInstructions} onChange={(event) => setCustomerInstructions(event.target.value)} placeholder="Customer setup instructions (optional)" className="h-20 w-full rounded-xl border border-slate-800 bg-[#070d19] p-3 text-sm text-white" />
            <input value={supplierConfirmation} onChange={(event) => setSupplierConfirmation(event.target.value)} placeholder="Supplier confirmation (optional)" className="w-full rounded-xl border border-slate-800 bg-[#070d19] p-3 text-sm text-white" />
            <div className="flex gap-3">
              <button onClick={() => { setSelectedOrder(null); setActionError(""); }} disabled={fulfilling} className="flex-1 rounded-xl bg-slate-800 py-3 text-xs font-bold disabled:opacity-50">Cancel</button>
              <button onClick={() => void handleFulfill()} disabled={fulfilling || !phoneNumber.trim()} className="flex-1 rounded-xl bg-emerald-500 py-3 text-xs font-black text-slate-950 disabled:opacity-50">{fulfilling ? "Activating…" : "Mark Active"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
