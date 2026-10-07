"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PhoneNumber = {
  id: string;
  phone_number: string;
  country_code: string | null;
  status: "active" | "suspended" | "released";
};

type Message = {
  id: string;
  phone_number_id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string;
  status: string;
  created_at: string;
};

export default function Page() {
  const [darkMode, setDarkMode] = useState(true);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const checkTheme = () => setDarkMode(localStorage.getItem("nava-theme") !== "light");
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800 shadow-md",
        inner: "bg-[#070d19] border border-slate-800/80",
        text: "text-white",
        muted: "text-gray-400",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        inner: "bg-slate-50 border-2 border-slate-200",
        text: "text-slate-900",
        muted: "text-slate-600 font-medium",
      };

  const selectedNumber = useMemo(
    () => numbers.find((number) => number.id === selectedNumberId) || null,
    [numbers, selectedNumberId]
  );

  const loadInbox = async () => {
    try {
      setLoading(true);
      setError("");
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/phone/messages", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load your messages.");

      const loadedNumbers = Array.isArray(data?.numbers) ? data.numbers : [];
      setNumbers(loadedNumbers);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);

      if (!selectedNumberId && loadedNumbers.length > 0) {
        setSelectedNumberId(loadedNumbers[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to load your messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
    // Initial inbox load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async () => {
    if (!selectedNumberId || !recipient.trim() || !text.trim()) return;

    try {
      setSending(true);
      setError("");
      setNotice("");

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/phone/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number_id: selectedNumberId,
          to: recipient.trim(),
          text: text.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to send your message.");

      if (data?.message) setMessages((current) => [...current, data.message]);
      setText("");
      setNotice("Message sent.");
    } catch (err: any) {
      setError(err?.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      <div>
        <Link
          href="/dashboard/sms"
          className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
        >
          ← NAVA Phone
        </Link>
        <h1 className="mt-3 text-2xl font-bold">💬 SMS Inbox</h1>
        <p className={`${theme.muted} mt-1 text-xs`}>Send and receive messages from your NAVA number.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      {loading ? (
        <div className={`${theme.card} rounded-3xl p-8 text-center`}>
          <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <p className={`text-xs ${theme.muted}`}>Loading your NAVA messages...</p>
        </div>
      ) : numbers.length === 0 ? (
        <div className={`${theme.card} rounded-3xl p-8 text-center`}>
          <div className="text-3xl">📱</div>
          <h2 className="mt-3 text-lg font-bold">No NAVA number yet</h2>
          <p className={`${theme.muted} mt-2 text-xs`}>Get a NAVA Phone number before opening your SMS inbox.</p>
          <Link href="/dashboard/sms" className="mt-5 inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950">
            Get a Number
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className={`${theme.card} rounded-3xl p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.muted}`}>Conversation</p>
                <h2 className="mt-1 text-lg font-bold">{selectedNumber?.phone_number || "NAVA Number"}</h2>
              </div>
              <select
                value={selectedNumberId}
                onChange={(event) => setSelectedNumberId(event.target.value)}
                className={`${theme.inner} rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-400`}
              >
                {numbers.map((number) => (
                  <option key={number.id} value={number.id}>{number.phone_number}</option>
                ))}
              </select>
            </div>

            <div className={`${theme.inner} mt-5 min-h-[360px] space-y-3 rounded-2xl p-4`}>
              {messages.filter((message) => message.phone_number_id === selectedNumberId).length === 0 ? (
                <div className={`flex min-h-[320px] items-center justify-center text-center ${theme.muted}`}>
                  <div>
                    <div className="text-3xl">💬</div>
                    <p className="mt-2 text-xs">No messages yet.</p>
                  </div>
                </div>
              ) : (
                messages
                  .filter((message) => message.phone_number_id === selectedNumberId)
                  .map((message) => (
                    <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.direction === "outbound" ? "bg-emerald-500 text-slate-950" : theme.inner}`}>
                        <p className="text-xs leading-relaxed">{message.body}</p>
                        <p className={`mt-1 text-[9px] opacity-60`}>
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className={`${theme.card} rounded-3xl p-5 sm:p-6`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.muted}`}>Send SMS</p>
            <h2 className="mt-1 text-lg font-bold">New message</h2>
            <p className={`mt-1 text-xs ${theme.muted}`}>
              From {selectedNumber?.phone_number || "your NAVA number"}.
            </p>

            <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider">Recipient</label>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="+1 555 123 4567"
              inputMode="tel"
              className={`${theme.inner} mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400`}
            />

            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider">Message</label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 1600))}
              placeholder="Write your message..."
              rows={6}
              className={`${theme.inner} mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400`}
            />
            <div className={`mt-1 text-right text-[9px] ${theme.muted}`}>{text.length}/1600</div>

            <button
              type="button"
              onClick={sendMessage}
              disabled={sending || !selectedNumberId || !recipient.trim() || !text.trim()}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
