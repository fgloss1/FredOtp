"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BrowseNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/rentals/available").then(r => r.json()).then(d => {
      setNumbers(d.numbers || []);
      setLoading(false);
    });
  }, []);

  async function handlePurchase(phoneNumberId: string) {
    const res = await fetch("/api/rentals/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "Purchase failed");
    else {
      alert("Successfully rented!");
      router.push("/dashboard/rentals");
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading catalog...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Phone Numbers</h1>
      {numbers.length === 0 ? <div className="bg-gray-900 p-8 rounded-xl text-center text-gray-500">No numbers available currently.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numbers.map((n) => (
            <div key={n.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <p className="text-xl font-mono font-bold text-white">{n.number}</p>
              <p className="text-sm text-gray-400 mb-4">{n.country}</p>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 font-bold">${n.monthlyPrice}/mo</span>
                <button onClick={() => handlePurchase(n.id)} className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-2 rounded-xl text-sm">Rent</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}