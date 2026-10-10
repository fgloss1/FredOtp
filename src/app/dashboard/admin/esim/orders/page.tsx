"use client";

import { useEffect, useState } from "react";

export default function AdminEsimOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Please sign in before accessing admin eSIM orders.");
        }

        const res = await fetch("/api/esim/admin/orders", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load eSIM orders");
        }

        if (!cancelled) setOrders(data.orders ?? []);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load eSIM orders"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFulfill() {
    if (!selectedOrder || !phoneNumber) return;
    try {
      setFulfilling(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const res = await fetch(`/api/esim/admin/orders/${selectedOrder.id}/fulfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          assigned_phone_number: phoneNumber,
          activation_code: activationCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to fulfill order");
      }

      alert("Order activated successfully");
      setSelectedOrder(null);
      window.location.reload();
+
      alert(err.message);
    } finally {
      setFulfilling(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 font-sans text-white">
      <h1 className="text-2xl font-bold">Admin eSIM Fulfillment Desk</h1>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading orders...</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-[#0b1120] border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{o.plan?.name} • User: {o.user_id.slice(0, 8)}...</p>
                <p className="text-xs text-slate-400">Status: {o.status} • ZIP: {o.zip_code || "N/A"}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(o);
                  setPhoneNumber(o.assigned_phone_number || "");
                }}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Fulfill Order
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg">Fulfill Order: {selectedOrder.plan?.name}</h3>
            <input
              type="text"
              placeholder="Assigned Phone Number (+1...)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-3 bg-[#070d19] border border-slate-800 rounded-xl text-white text-sm"
            />
            <textarea
              placeholder="Activation Code / Setup Instructions"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              className="w-full p-3 bg-[#070d19] border border-slate-800 rounded-xl text-white text-sm h-24"
            />
            <div className="flex gap-2">
              <button onClick={() => setSelectedOrder(null)} className="flex-1 py-3 bg-slate-800 text-xs font-bold rounded-xl">
                Cancel
              </button>
              <button onClick={handleFulfill} disabled={fulfilling} className="flex-1 py-3 bg-emerald-500 text-slate-950 text-xs font-black rounded-xl">
                {fulfilling ? "Activating..." : "Mark Active"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}