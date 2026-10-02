"use client";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const [numbers, setNumbers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/numbers").then(r => r.json()).then(d => setNumbers(d.numbers || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Inventory Management</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400 text-xs border-b border-gray-800">
            <tr>
              <th className="p-4">NUMBER</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">PRICE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {numbers.map((n) => (
              <tr key={n.id}>
                <td className="p-4 font-mono">{n.number}</td>
                <td className="p-4"><span className="text-xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">{n.status}</span></td>
                <td className="p-4 text-emerald-400 font-bold">${n.monthlyPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}