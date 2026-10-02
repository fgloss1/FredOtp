"use client";
import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/orders").then(r => r.json()).then(d => setOrders(d.orders || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders Ledger</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        {orders.length === 0 ? <p className="p-8 text-center text-gray-500 text-sm">No orders yet.</p> : orders.map((o) => (
          <div key={o.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-white text-sm font-medium">{o.description}</p>
              <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="font-mono text-emerald-400 font-bold">${parseFloat(o.totalAmount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}