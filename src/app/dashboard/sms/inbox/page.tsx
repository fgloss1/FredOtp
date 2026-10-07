"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length > 10 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1)}`;
  }
  return value;
}

function flagForCountry(countryCode: string | null) {
  if (!countryCode || countryCode.length !== 2) return "📱";
  return countryCode
    .toUpperCase()
    .split("")
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [composeOpen, setComposeOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const checkTheme = () => setDarkMode(localStorage.getItem("nava-theme") !== "light");
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  const theme = darkMode
    ? {
        page: "bg-[#050914]",
        panel: "bg-[#0a1020]/95 border-slate-800/80",
        soft: "bg-[#0d1527] border-slate-800/80",
        input: "bg-[#080e1b] border-slate-700/80",
        text: "text-white",
        muted: "text-slate-400",
        faint: "text-slate-500",
        divider: "border-slate-800",
      }
    : {
        page: "bg-slate-50",
        panel: "bg-white border-slate-200",
        soft: "bg-slate-100 border-slate-200",
        input: "bg-white border-slate-300",
        text: "text-slate-900",
        muted: "text-slate-600",
        faint: "text-slate-500",
        divider: "border-slate-200",
      };

  const selectedNumber = useMemo(
    () => numbers.find((number) => number.id === selectedNumberId) || null,
    [numbers, selectedNumberId]
  );

  const selectedMessages = useMemo(
    () => messages.filter((message) => message.phone_number_id === selectedNumberId),
    [messages, selectedNumberId]
  );

  const conversationPeer = useMemo(() => {
    const last = selectedMessages[selectedMessages.length - 1];
    if (!last) return null;
    return last.direction === "inbound" ? last.from_number : last.to_number;
  }, [selectedMessages]);

  const scrollToLatest = (smooth = true) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      });
    });
  };

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

  useEffect(() => {
    if (!loading) scrollToLatest(false);
  }, [selectedNumberId, loading]);

  useEffect(() => {
    if (!loading && selectedMessages.length > 0) scrollToLatest(true);
  }, [selectedMessages.length, loading]);

  useEffect(() => {
    if (composeOpen) {
      requestAnimationFrame(() => composerRef.current?.focus());
    }
  }, [composeOpen]);

  const sendMessage = async () => {
    if (!selectedNumberId || !recipient.trim() || !text.trim() || sending) return;

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
      setComposeOpen(false);
      setNotice("Message sent.");
    } catch (err: any) {
      setError(err?.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const copyNumber = async () => {
    if (!selectedNumber?.phone_number) return;
    try {
      await navigator.clipboard.writeText(selectedNumber.phone_number);
      setNotice("NAVA number copied.");
      window.setTimeout(() => setNotice(""), 1800);
    } catch {
      setNotice("Number: " + selectedNumber.phone_number);
    }
  };

  const openCompose = () => {
    setError("");
    setNotice("");
    setRecipient("");
    setText("");
    setComposeOpen(true);
  };

  const startQuickReply = () => {
    if (conversationPeer) {
      setRecipient(conversationPeer);
      setComposeOpen(true);
    } else {
      openCompose();
    }
  };

  return (
    <div className={`min-h-[calc(100vh-2rem)] ${theme.page} ${theme.text} rounded-[28px] font-sans`}>
      <div className="mx-auto max-w-6xl px-1 py-1 sm:px-4 sm:py-4">
        <div className={`overflow-hidden rounded-[28px] border ${theme.panel} shadow-2xl`}>
          <header className={`flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4 ${theme.divider}`}>
            <Link
              href="/dashboard/sms"
              className="flex min-w-[70px] items-center gap-1 text-sm font-semibold transition hover:text-emerald-400"
            >
              <span className="text-2xl leading-none">‹</span>
              <span>Phone</span>
            </Link>

            <div className="text-center">
              <h1 className="text-[17px] font-bold tracking-tight">Messages</h1>
              <p className={`text-[10px] ${theme.faint}`}>NAVA Phone</p>
            </div>

            <button
              type="button"
              onClick={openCompose}
              aria-label="New message"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-xl font-light text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              +
            </button>
          </header>

          {error && (
            <div className="mx-4 mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-400 sm:mx-6">
              {error}
            </div>
          )}
          {notice && (
            <div className="mx-4 mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400 sm:mx-6">
              {notice}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[620px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <p className={`mt-3 text-xs ${theme.muted}`}>Loading Messages...</p>
              </div>
            </div>
          ) : numbers.length === 0 ? (
            <div className="flex min-h-[620px] items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">📱</div>
                <h2 className="mt-5 text-xl font-bold">No NAVA number yet</h2>
                <p className={`mt-2 text-sm leading-relaxed ${theme.muted}`}>
                  Get a NAVA Phone number and your Messages inbox will be ready here.
                </p>
                <Link
                  href="/dashboard/sms"
                  className="mt-6 inline-flex rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  Get a Number
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[620px] lg:grid-cols-[245px_minmax(0,1fr)]">
              <aside className={`hidden border-r p-3 lg:block ${theme.divider}`}>
                <div className="flex items-center justify-between px-3 pb-3 pt-2">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${theme.faint}`}>Your Numbers</p>
                  <span className={`rounded-full px-2 py-1 text-[9px] ${theme.soft} ${theme.faint}`}>{numbers.length}</span>
                </div>

                <div className="space-y-1">
                  {numbers.map((number) => {
                    const active = number.id === selectedNumberId;
                    const numberMessages = messages.filter((message) => message.phone_number_id === number.id);
                    const lastMessage = numberMessages[numberMessages.length - 1];
                    const peer = lastMessage
                      ? lastMessage.direction === "inbound"
                        ? lastMessage.from_number
                        : lastMessage.to_number
                      : null;

                    return (
                      <button
                        key={number.id}
                        type="button"
                        onClick={() => {
                          setSelectedNumberId(number.id);
                          setNotice("");
                          setError("");
                        }}
                        className={`w-full rounded-2xl px-3 py-3 text-left transition ${active ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/10" : "hover:bg-white/[0.04]"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-slate-950">
                            {flagForCountry(number.country_code)}
                            {lastMessage && (
                              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a1020] bg-emerald-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-xs font-bold ${active ? "text-emerald-400" : ""}`}>
                              {formatPhoneNumber(number.phone_number)}
                            </p>
                            <p className={`mt-0.5 truncate text-[10px] ${theme.faint}`}>
                              {peer ? formatPhoneNumber(peer) : "No conversations yet"}
                            </p>
                          </div>
                          {numberMessages.length > 0 && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${theme.soft} ${theme.faint}`}>
                              {numberMessages.length}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="flex min-w-0 flex-col">
                <div className={`border-b px-4 py-3 sm:px-6 ${theme.divider}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg text-slate-950 shadow-md">
                        {flagForCountry(selectedNumber?.country_code || null)}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a1020] bg-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[15px] font-bold">
                          {conversationPeer ? formatPhoneNumber(conversationPeer) : "NAVA Messages"}
                        </h2>
                        <p className={`mt-0.5 truncate text-[10px] ${theme.faint}`}>
                          {selectedNumber ? `via ${formatPhoneNumber(selectedNumber.phone_number)}` : "NAVA Phone"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyNumber}
                      className={`rounded-full border px-3 py-2 text-[10px] font-semibold transition ${theme.input} hover:border-emerald-400 hover:text-emerald-400`}
                    >
                      Copy number
                    </button>
                  </div>

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                    {numbers.map((number) => (
                      <button
                        key={number.id}
                        type="button"
                        onClick={() => setSelectedNumberId(number.id)}
                        className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-semibold ${number.id === selectedNumberId ? "border-emerald-400 bg-emerald-500/10 text-emerald-400" : `${theme.input} ${theme.muted}`}`}
                      >
                        {flagForCountry(number.country_code)} {formatPhoneNumber(number.phone_number)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`relative flex min-h-[420px] flex-1 flex-col overflow-hidden ${darkMode ? "bg-[#070c17]" : "bg-slate-50"}`}>
                  <div className="pointer-events-none absolute inset-0 opacity-[0.02] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:18px_18px]" />

                  <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-6 sm:px-8">
                    {selectedMessages.length === 0 ? (
                      <div className={`flex min-h-[360px] items-center justify-center text-center ${theme.muted}`}>
                        <div>
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">💬</div>
                          <p className="mt-4 text-sm font-semibold">No messages yet</p>
                          <p className={`mt-1 max-w-xs text-xs ${theme.faint}`}>
                            Start a conversation using your NAVA number.
                          </p>
                          <button
                            type="button"
                            onClick={openCompose}
                            className="mt-4 rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                          >
                            New Message
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center pb-2">
                          <span className={`rounded-full px-3 py-1 text-[9px] font-medium ${darkMode ? "bg-slate-800/70 text-slate-400" : "bg-slate-200 text-slate-500"}`}>
                            Today
                          </span>
                        </div>

                        {selectedMessages.map((message) => {
                          const outbound = message.direction === "outbound";
                          return (
                            <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[82%] sm:max-w-[70%] ${outbound ? "items-end" : "items-start"}`}>
                                <div className={`rounded-[22px] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${outbound ? "rounded-br-[7px] bg-emerald-500 text-slate-950" : `${theme.soft} rounded-bl-[7px] border`}`}>
                                  {message.body}
                                </div>
                                <p className={`mt-1 px-1 text-[9px] ${outbound ? "text-right" : "text-left"} ${theme.faint}`}>
                                  {formatMessageTime(message.created_at)}
                                  {outbound && ` · ${message.status === "sent" ? "Delivered" : message.status}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <div className={`relative border-t p-3 sm:p-4 ${theme.divider} ${darkMode ? "bg-[#090f1d]/95" : "bg-white/95"}`}>
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={openCompose}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xl transition hover:border-emerald-400 hover:text-emerald-400 ${theme.input}`}
                        aria-label="New message"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={startQuickReply}
                        className={`flex min-h-10 flex-1 items-center rounded-full border px-4 py-2.5 text-left text-xs ${theme.input} ${theme.faint} transition hover:border-emerald-400`}
                      >
                        Message
                      </button>

                      <button
                        type="button"
                        onClick={startQuickReply}
                        disabled={!conversationPeer}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Reply"
                      >
                        ↑
                      </button>
                    </div>
                    <p className={`mt-2 hidden text-center text-[9px] sm:block ${theme.faint}`}>
                      Press Enter to send · Shift + Enter for a new line
                    </p>
                  </div>
                </div>
              </main>
            </div>
          )}
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className={`w-full max-w-lg rounded-t-[30px] border p-5 shadow-2xl sm:rounded-[28px] ${theme.panel}`}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 sm:hidden" />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">New Message</h2>
                <p className={`mt-1 text-xs ${theme.muted}`}>Send from your NAVA number.</p>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-lg ${theme.soft}`}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <label className={`text-[10px] font-bold uppercase tracking-[0.12em] ${theme.faint}`}>From</label>
              <select
                value={selectedNumberId}
                onChange={(event) => setSelectedNumberId(event.target.value)}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-emerald-400 ${theme.input}`}
              >
                {numbers.map((number) => (
                  <option key={number.id} value={number.id}>
                    {flagForCountry(number.country_code)} {formatPhoneNumber(number.phone_number)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className={`text-[10px] font-bold uppercase tracking-[0.12em] ${theme.faint}`}>To</label>
              <input
                autoFocus={!conversationPeer}
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="+1 555 123 4567"
                inputMode="tel"
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-emerald-400 ${theme.input}`}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className={`text-[10px] font-bold uppercase tracking-[0.12em] ${theme.faint}`}>Message</label>
                <span className={`text-[9px] ${theme.faint}`}>{text.length}/1600</span>
              </div>
              <textarea
                ref={composerRef}
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 1600))}
                onKeyDown={handleComposerKeyDown}
                placeholder="Message..."
                rows={5}
                className={`mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none focus:border-emerald-400 ${theme.input}`}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className={`flex-1 rounded-full border px-4 py-3 text-xs font-semibold ${theme.input}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendMessage}
                disabled={sending || !selectedNumberId || !recipient.trim() || !text.trim()}
                className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
