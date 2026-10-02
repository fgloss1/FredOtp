"use client";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/sms/inbox").then(r => r.json()).then(d => setMessages(d.messages || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">SMS Inbox</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl divide-y divide-gray-800">
        {messages.length === 0 ? <p className="p-8 text-center text-gray-500 text-sm">No incoming messages received yet.</p> : messages.map((m) => (
          <div key={m.id} className="p-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{m.fromNumber} → {m.toNumber}</span>
              <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-white bg-gray-950 p-3 rounded-lg font-mono">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}