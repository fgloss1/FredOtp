"use client";
import { useEffect, useState } from "react";

export default function DeveloperPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/developer/keys").then(r => r.json()).then(d => setKeys(d.keys || []));
  }, []);

  async function handleCreate() {
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Production API Key" }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedKey(data.key.rawKey);
      setKeys(prev => [data.key, ...prev]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Developer API Keys</h1>
        <button onClick={handleCreate} className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold px-4 py-2 rounded-xl text-sm">Create Key</button>
      </div>

      {createdKey && (
        <div className="bg-emerald-950 border border-emerald-700 p-4 rounded-xl">
          <p className="text-xs text-emerald-300 mb-1 font-bold">New Secret Key (Copy now!):</p>
          <p className="font-mono text-white text-sm">{createdKey}</p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        {keys.length === 0 ? <p className="p-6 text-gray-500 text-sm">No keys yet.</p> : keys.map((k) => (
          <div key={k.id} className="p-4 flex justify-between">
            <span className="font-mono text-emerald-400">{k.keyPrefix}••••••••</span>
            <span className="text-xs text-gray-400">{new Date(k.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}