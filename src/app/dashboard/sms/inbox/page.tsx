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

function getMessagePeer(message: Message) {
  return message.direction === "inbound" ? message.from_number : message.to_number;
}

export default function Page() {
  const [darkMode, setDarkMode] = useState(true);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contactNames, setContactNames] = useState<Record<string, string>>({});
  const [contactNameOpen, setContactNameOpen] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("");
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [addNumberOpen, setAddNumberOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "conversation" | "compose">("list");
  const [mobilePeer, setMobilePeer] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileFromPickerOpen, setMobileFromPickerOpen] = useState(false);
  const mobileRecipientRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const checkTheme = () => setDarkMode(localStorage.getItem("nava-theme") !== "light");
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nava-contact-names");
      if (saved) setContactNames(JSON.parse(saved));
    } catch {
      setContactNames({});
    }
  }, []);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
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

  const selectedNumberMessages = useMemo(
    () => messages.filter((message) => message.phone_number_id === selectedNumberId),
    [messages, selectedNumberId]
  );

  const selectedMessages = useMemo(
    () =>
      selectedPeer
        ? selectedNumberMessages.filter(
            (message) => getMessagePeer(message) === selectedPeer
          )
        : [],
    [selectedNumberMessages, selectedPeer]
  );

  const conversationPeer = selectedPeer || null;
  const selectedContactKey =
    selectedNumberId && selectedPeer ? `${selectedNumberId}::${selectedPeer}` : "";
  const selectedContactName = selectedContactKey
    ? contactNames[selectedContactKey] || ""
    : "";

  const openContactNameEditor = () => {
    if (!selectedContactKey) return;
    setContactNameDraft(selectedContactName);
    setContactNameOpen(true);
    setError("");
    setNotice("");
  };

  const saveContactName = () => {
    if (!selectedContactKey) return;
    const next = { ...contactNames };
    const cleanName = contactNameDraft.trim();
    if (cleanName) next[selectedContactKey] = cleanName;
    else delete next[selectedContactKey];
    setContactNames(next);
    localStorage.setItem("nava-contact-names", JSON.stringify(next));
    setContactNameOpen(false);
    setNotice(cleanName ? "Contact name saved." : "Contact name removed.");
  };

  const conversationThreads = useMemo(() => {
    return messages
      .reduce<
        Array<{
          key: string;
          phoneNumberId: string;
          peer: string;
          threadMessages: Message[];
          number: PhoneNumber | null;
        }>
      >((threads, message) => {
        const peer = getMessagePeer(message);
        const key = `${message.phone_number_id}::${peer}`;
        const existing = threads.find((thread) => thread.key === key);

        if (existing) {
          existing.threadMessages.push(message);
        } else {
          threads.push({
            key,
            phoneNumberId: message.phone_number_id,
            peer,
            threadMessages: [message],
            number: numbers.find((number) => number.id === message.phone_number_id) || null,
          });
        }

        return threads;
      }, [])
      .sort((a, b) => {
        const aLast = a.threadMessages[a.threadMessages.length - 1];
        const bLast = b.threadMessages[b.threadMessages.length - 1];
        return (
          new Date(bLast?.created_at || 0).getTime() -
          new Date(aLast?.created_at || 0).getTime()
        );
      });
  }, [messages, numbers]);

  const handleNumberSelectorChange = (value: string) => {
    if (value === "__buy__") {
      openAddNumber();
      return;
    }

    setSelectedNumberId(value);
    setSelectedPeer("");
    setRecipient("");
    setNotice("");
    setError("");
  };

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

  const loadInbox = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      const loadedMessages = Array.isArray(data?.messages) ? data.messages : [];
      setNumbers(loadedNumbers);
      setMessages(loadedMessages);

      if (!selectedNumberId && loadedNumbers.length > 0) {
        const firstNumber = loadedNumbers[0];
        setSelectedNumberId(loadedNumbers[0].id);
        setSelectedPeer("");
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
    const refreshId = window.setInterval(() => {
      void loadInbox(false);
    }, 5000);

    return () => window.clearInterval(refreshId);
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

  useEffect(() => {
    if (mobileView === "compose") {
      requestAnimationFrame(() => mobileRecipientRef.current?.focus());
    }
  }, [mobileView]);

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
      setMobilePeer(recipient.trim());
      setMobileView("conversation");
      setComposeOpen(false);
      setMobileFromPickerOpen(false);
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

  const openAddNumber = () => {
    setError("");
    setNotice("");
    setAddNumberOpen(true);
  };

  const refreshNumbers = async () => {
    await loadInbox();
    setNotice("Your NAVA numbers are up to date.");
  };

  const openCompose = () => {
    setError("");
    setNotice("");
    setSelectedPeer("");
    setRecipient("");
    setText("");
    setMobilePeer("");
    setMobileFromPickerOpen(false);
    setComposeOpen(true);
    setMobileView("compose");
  };

  const openMobileThread = (numberId: string, peer: string) => {
    setSelectedNumberId(numberId);
    setSelectedPeer(peer);
    setMobilePeer(peer);
    setRecipient(peer);
    setText("");
    setError("");
    setNotice("");
    setMobileView("conversation");
  };

  const closeMobileCompose = () => {
    setMobileFromPickerOpen(false);
    setMobileView(mobilePeer ? "conversation" : "list");
    setComposeOpen(false);
    setText("");
    setError("");
    setNotice("");
  };

  const startQuickReply = () => {
    if (conversationPeer) {
      setRecipient(conversationPeer);
      composerRef.current?.focus();
    } else {
      openCompose();
    }
  };

  const handleInlineComposerFocus = () => {
    if (!conversationPeer) {
      openCompose();
    } else if (!recipient) {
      setRecipient(conversationPeer);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-2rem)] ${theme.page} ${theme.text} rounded-[28px] font-sans`}>
      <div className="phone-inbox-mobile lg:hidden min-h-[100dvh] bg-black text-white">
        <div className="flex min-h-[100dvh] flex-col">
          {mobileView === "list" && (
            <>
              <header className="flex items-center justify-between px-4 pb-3 pt-5">
                <Link href="/dashboard/sms" className="text-[15px] font-semibold text-white/90">Phone</Link>
                <h1 className="text-[20px] font-bold tracking-tight">Messages</h1>
                <button
                  type="button"
                  onClick={openAddNumber}
                  aria-label="Manage NAVA numbers"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#242426] text-lg text-white/80"
                >
                  ⋯
                </button>
              </header>

              <div className="px-4 pt-1">
                {error && <div className="mb-3 rounded-2xl bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</div>}
                {notice && <div className="mb-3 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{notice}</div>}
              </div>

              <main className="relative flex-1 px-2 pb-36">
                {loading ? (
                  <div className="flex min-h-[55vh] items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex min-h-[58vh] items-center justify-center px-8 text-center">
                    <div>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#29292c] text-2xl">💬</div>
                      <h2 className="mt-4 text-[16px] font-semibold text-white">No Messages</h2>
                      <p className="mt-1 text-[11px] text-white/45">Messages you send or receive will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 pt-2">
                    {numbers.map((number) => {
                      const numberMessages = messages.filter((message) => message.phone_number_id === number.id);
                      const threads = Array.from(new Set(numberMessages.map((message) => message.direction === "inbound" ? message.from_number : message.to_number)));
                      return threads.map((peer) => {
                        const threadMessages = numberMessages.filter((message) => (message.direction === "inbound" ? message.from_number : message.to_number) === peer);
                        const lastMessage = threadMessages[threadMessages.length - 1];
                        return (
                          <button
                            key={`${number.id}-${peer}`}
                            type="button"
                            onClick={() => openMobileThread(number.id, peer)}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-white/10"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-base font-bold text-slate-950">
                              {flagForCountry(number.country_code)}
                            </div>
                            <div className="min-w-0 flex-1 border-b border-white/10 pb-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-[15px] font-semibold">{formatPhoneNumber(peer)}</p>
                                <span className="shrink-0 text-[10px] text-white/35">{lastMessage ? formatMessageTime(lastMessage.created_at) : ""}</span>
                              </div>
                              <p className="mt-1 truncate text-[12px] text-white/45">{lastMessage?.body || formatPhoneNumber(number.phone_number)}</p>
                            </div>
                          </button>
                        );
                      });
                    })}
                  </div>
                )}

                <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-white/10 bg-black/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-full bg-[#1c1c1e] px-4">
                      <span className="mr-2 text-sm text-white/35">⌕</span>
                      <input
                        value={mobileSearch}
                        onChange={(event) => setMobileSearch(event.target.value)}
                        placeholder="Search"
                        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openCompose}
                      aria-label="New Message"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-xl text-black shadow-lg"
                    >
                      ↗
                    </button>
                  </div>
                </div>
              </main>
            </>
          )}

          {mobileView === "conversation" && (
            <div className="flex min-h-[100dvh] flex-col bg-black pb-16">
              <header className="flex items-center gap-3 border-b border-white/10 px-4 pb-3 pt-5">
                <button type="button" onClick={() => { setMobileView("list"); setMobilePeer(""); }} className="text-3xl leading-none text-white/80" aria-label="Back">‹</button>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs text-slate-950">
                    {flagForCountry(selectedNumber?.country_code || null)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{formatPhoneNumber(mobilePeer || conversationPeer || "")}</p>
                    <p className="truncate text-[10px] text-white/40">via {selectedNumber ? formatPhoneNumber(selectedNumber.phone_number) : "NAVA Phone"}</p>
                  </div>
                </div>
                <button type="button" onClick={copyNumber} className="text-lg text-white/60" aria-label="Copy number">⋯</button>
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-5">
                {selectedMessages.filter((message) => {
                  const peer = message.direction === "inbound" ? message.from_number : message.to_number;
                  return !mobilePeer || peer === mobilePeer;
                }).length === 0 ? (
                  <div className="flex min-h-[55vh] items-center justify-center text-center">
                    <div>
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#29292c] text-xl">💬</div>
                      <p className="mt-3 text-sm text-white/55">Start your conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedMessages.filter((message) => {
                      const peer = message.direction === "inbound" ? message.from_number : message.to_number;
                      return !mobilePeer || peer === mobilePeer;
                    }).map((message) => {
                      const outbound = message.direction === "outbound";
                      return (
                        <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[78%] rounded-[21px] px-4 py-2.5 text-[15px] leading-relaxed ${outbound ? "rounded-br-[7px] bg-[#0a84ff] text-white" : "rounded-bl-[7px] bg-[#262628] text-white"}`}>
                            {message.body}
                            <div className={`mt-1 text-[9px] ${outbound ? "text-right text-white/55" : "text-white/35"}`}>{formatMessageTime(message.created_at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-black/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl">
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => setMobileFromPickerOpen((value) => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1c1e] text-xl text-white/75">+</button>
                  <textarea
                    ref={composerRef}
                    value={text}
                    onChange={(event) => { setText(event.target.value.slice(0, 1600)); if (!recipient && mobilePeer) setRecipient(mobilePeer); }}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    placeholder="Message"
                    className="max-h-28 min-h-9 flex-1 resize-none rounded-[20px] border border-white/10 bg-[#1c1c1e] px-4 py-2 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-white/20"
                  />
                  <button type="button" onClick={() => void sendMessage()} disabled={sending || !text.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] text-lg font-bold text-white disabled:opacity-30" aria-label="Send">{sending ? "…" : "↑"}</button>
                </div>

                {mobileFromPickerOpen && (
                  <div className="mt-2 rounded-2xl border border-white/10 bg-[#1c1c1e] p-2">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Send from</p>
                    {numbers.map((number) => (
                      <button key={number.id} type="button" onClick={() => { setSelectedNumberId(number.id); setMobileFromPickerOpen(false); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs ${number.id === selectedNumberId ? "bg-white/10 text-white" : "text-white/65"}`}>
                        <span>{flagForCountry(number.country_code)}</span>
                        <span>{formatPhoneNumber(number.phone_number)}</span>
                        {number.id === selectedNumberId && <span className="ml-auto text-emerald-400">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {mobileView === "compose" && (
            <div className="flex min-h-[100dvh] flex-col bg-[#1c1c1e] pb-16">
              <header className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-5">
                <button type="button" onClick={closeMobileCompose} className="text-[15px] text-white/75">‹</button>
                <h1 className="text-[15px] font-semibold">New Message</h1>
                <button type="button" onClick={closeMobileCompose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2c2c2e] text-lg text-white/70" aria-label="Close">×</button>
              </header>

              <div className="px-3">
                {error && <div className="mt-3 rounded-2xl bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</div>}
                {notice && <div className="mt-3 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">{notice}</div>}
              </div>

              <div className="border-b border-white/10 px-3">
                <div className="flex items-center border-b border-white/10 py-3">
                  <span className="mr-2 text-[14px] text-white/45">To:</span>
                  <input
                    ref={mobileRecipientRef}
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                    placeholder="Phone number"
                    inputMode="tel"
                    autoComplete="tel"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
                  />
                  <button type="button" onClick={() => setMobileFromPickerOpen((value) => !value)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3a3a3c] text-base text-white/80" aria-label="Choose NAVA number">+</button>
                </div>
              </div>

              {mobileFromPickerOpen && (
                <div className="mx-3 mt-2 rounded-2xl border border-white/10 bg-[#2c2c2e] p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Send from</p>
                  {numbers.map((number) => (
                    <button key={number.id} type="button" onClick={() => { setSelectedNumberId(number.id); setMobileFromPickerOpen(false); }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs ${number.id === selectedNumberId ? "bg-white/10 text-white" : "text-white/65"}`}>
                      <span>{flagForCountry(number.country_code)}</span><span>{formatPhoneNumber(number.phone_number)}</span>
                      {number.id === selectedNumberId && <span className="ml-auto text-emerald-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1" />

              <div className="border-t border-white/10 bg-[#1c1c1e] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => setMobileFromPickerOpen((value) => !value)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3a3a3c] text-xl text-white/80">+</button>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, 1600))}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    placeholder=""
                    className="min-h-9 max-h-28 flex-1 resize-none rounded-[20px] border border-white/10 bg-[#2c2c2e] px-4 py-2 text-[15px] text-white outline-none placeholder:text-white/30"
                  />
                  <button type="button" onClick={() => void sendMessage()} disabled={sending || !selectedNumberId || !recipient.trim() || !text.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] text-lg font-bold text-white disabled:opacity-30" aria-label="Send">{sending ? "…" : "↑"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  
    <div className="hidden lg:flex flex-col h-screen w-full bg-white text-slate-900 overflow-hidden">
      <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center px-4">
        <div className="w-80 shrink-0 flex items-center gap-3">
          <button type="button" className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50" aria-label="Open navigation menu">☰</button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center">N</span>
            <span className="text-lg font-black tracking-wider text-emerald-600">NAVA</span>
          </Link>
        </div>

        <div className="flex-1 flex justify-center px-8">
          <div className="w-full max-w-xl relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input type="search" placeholder="Search messages, contacts and numbers" className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white" aria-label="Search" />
          </div>
        </div>

        <div className="w-80 shrink-0 flex items-center justify-end gap-2">
          <Link href="/dashboard/wallet" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 hover:bg-slate-50">
            {"$"}{userBalance.toFixed(2)}
          </Link>
          <button type="button" className="h-9 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" aria-label="User profile">{userEmail}</button>
          <button type="button" className="h-9 w-9 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50" aria-label="Settings">⚙</button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <nav className="w-16 shrink-0 border-r border-slate-200 bg-white flex flex-col items-center py-4 gap-2">
          <button type="button" className="h-11 w-11 rounded-xl text-slate-500 hover:bg-slate-50 flex items-center justify-center" aria-label="Calls">☎</button>
          <button type="button" className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center" aria-label="Messages">💬</button>
          <button type="button" className="h-11 w-11 rounded-xl text-slate-500 hover:bg-slate-50 flex items-center justify-center" aria-label="Voicemail">◉</button>
        </nav>

        <section className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col min-h-0">
          <div className="h-16 shrink-0 border-b border-slate-200 px-4 flex items-center">
            <button type="button" onClick={openCompose} className="w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">+ Send new message</button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-2">
            {conversationThreads.length === 0 ? (
              <div className="h-full flex items-center justify-center px-4 text-center text-sm text-slate-400">No conversations yet</div>
            ) : (
              <div className="space-y-1">
                {conversationThreads.map(({ key, phoneNumberId, peer, threadMessages }) => {
                  const lastMessage = threadMessages[threadMessages.length - 1];
                  const contactName = contactNames[phoneNumberId + "::" + peer] || "";
                  const active = phoneNumberId === selectedNumberId && peer === selectedPeer;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedNumberId(phoneNumberId);
                        setSelectedPeer(peer);
                        setRecipient(peer);
                        setNotice("");
                        setError("");
                      }}
                      className={"w-full rounded-2xl px-3 py-3 text-left transition " + (active ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {contactName ? contactName.slice(0, 2).toUpperCase() : peer.slice(-2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={"text-sm font-extrabold leading-tight whitespace-nowrap " + (active ? "text-emerald-700" : "text-slate-900")}>
                                {contactName || formatPhoneNumber(peer)}
                              </p>
                              {contactName && <p className="mt-0.5 text-xs font-mono font-semibold text-slate-600 whitespace-nowrap">{formatPhoneNumber(peer)}</p>}
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400">{formatMessageTime(lastMessage.created_at)}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{lastMessage.body}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex-1 min-w-0 min-h-0 border-r border-slate-200 bg-white flex flex-col">
          <header className="h-16 shrink-0 border-b border-slate-200 px-5 flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                {selectedPeer ? (selectedContactName || selectedPeer.slice(-2)) : "N"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 whitespace-nowrap">
                    {selectedPeer ? (selectedContactName || formatPhoneNumber(selectedPeer)) : "Select a conversation"}
                  </h2>
                  {selectedPeer && (
                    <button type="button" onClick={openContactNameEditor} className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-600">
                      {selectedContactName ? "Edit name" : "Add name"}
                    </button>
                  )}
                </div>
                {selectedPeer && <p className="text-xs font-mono font-bold text-slate-600 whitespace-nowrap">{formatPhoneNumber(selectedPeer)}</p>}
              </div>
            </div>

            <button
              type="button"
              disabled={!selectedPeer}
              onClick={() => {
                const input = document.getElementById("nava-dialer-input");
                if (input instanceof HTMLInputElement && selectedPeer) {
                  input.value = formatPhoneNumber(selectedPeer);
                  input.focus();
                }
              }}
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
              aria-label="Call contact"
            >☎</button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4">
            {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</div>}
            {notice && <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">{notice}</div>}
            {selectedMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-sm text-slate-400">Select a conversation from the left.</div>
            ) : (
              <div className="space-y-3">
                {selectedMessages.map((message) => {
                  const outbound = message.direction === "outbound";
                  return (
                    <div key={message.id} className={"flex " + (outbound ? "justify-end" : "justify-start")}>
                      <div className={"max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm " + (outbound ? "bg-emerald-500 text-slate-950 rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md")}>
                        {message.body}
                        <div className={"mt-1 text-[9px] " + (outbound ? "text-slate-900/60" : "text-slate-400")}>
                          {formatMessageTime(message.created_at)}
                          {outbound && (" · " + (
                            message.status === "delivered" ? "Delivered" :
                            message.status === "sent" ? "Sent" :
                            message.status === "queued" ? "Queued" :
                            message.status === "unconfirmed" ? "Delivery unconfirmed" :
                            message.status === "failed" ? "Failed" :
                            message.status
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-5">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <button type="button" className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white text-slate-500 flex items-center justify-center hover:bg-slate-50" aria-label="Attach">📎</button>
              <textarea
                ref={composerRef}
                value={text}
                onChange={(event) => {
                  setText(event.target.value.slice(0, 1600));
                  if (!recipient && conversationPeer) setRecipient(conversationPeer);
                }}
                onFocus={handleInlineComposerFocus}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                placeholder={conversationPeer ? "Message" : "Select a conversation"}
                disabled={!conversationPeer}
                className="min-h-10 max-h-28 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50"
              />
              <button type="button" onClick={sendMessage} disabled={sending || !conversationPeer || !text.trim()} className="h-10 w-10 shrink-0 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold hover:bg-emerald-400 disabled:opacity-40" aria-label="Send">↑</button>
            </div>
          </footer>
        </section>

        <aside className="w-80 shrink-0 bg-slate-50 flex flex-col min-h-0">
          <header className="h-16 shrink-0 border-b border-slate-200 px-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">Call as</p>
              <select
                value={selectedNumberId}
                onChange={(event) => {
                  if (event.target.value === "__buy__") {
                    openAddNumber();
                    return;
                  }
                  setSelectedNumberId(event.target.value);
                  setSelectedPeer("");
                  setRecipient("");
                }}
                className="w-full max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-lg font-extrabold text-slate-900 outline-none focus:border-emerald-400"
                aria-label="Select NAVA number to call from"
              >
                {numbers.map((number) => <option key={number.id} value={number.id}>{formatPhoneNumber(number.phone_number)}</option>)}
                <option value="__buy__">＋ Add a new number</option>
              </select>
            </div>
            <button type="button" onClick={openAddNumber} className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center hover:bg-emerald-400" aria-label="Add new number">+</button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-5">
            <input id="nava-dialer-input" type="tel" placeholder="Enter a name or number" className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400" aria-label="Enter a name or number" />

            <div id="nava-keypad" className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["1", ""], ["2", "ABC"], ["3", "DEF"],
                ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
                ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
                ["*", ""], ["0", "+"], ["#", ""],
              ].map(([digit, letters]) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("nava-dialer-input");
                    if (input instanceof HTMLInputElement) {
                      input.value += digit;
                      input.focus();
                    }
                  }}
                  className="h-16 rounded-full border border-slate-200 bg-white text-slate-900 flex flex-col items-center justify-center hover:bg-slate-100"
                >
                  <span className="text-lg font-bold leading-none">{digit}</span>
                  {letters && <span className="mt-1 text-[9px] tracking-[0.18em] text-slate-400">{letters}</span>}
                </button>
              ))}
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const keypad = document.getElementById("nava-keypad");
                  if (keypad) keypad.classList.toggle("hidden");
                }}
                className="rounded-full border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >Hide keypad</button>
              <button type="button" className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400">☎ Call</button>
            </div>
          </footer>
        </aside>
      </div>
    </div>      {contactNameOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-[24px] border p-5 shadow-2xl ${theme.panel}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{selectedContactName ? "Edit contact name" : "Add contact name"}</h2>
                <p className={`mt-1 text-xs ${theme.muted}`}>{conversationPeer ? formatPhoneNumber(conversationPeer) : ""}</p>
              </div>
              <button type="button" onClick={() => setContactNameOpen(false)} className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.soft}`} aria-label="Close">×</button>
            </div>
            <input
              autoFocus
              value={contactNameDraft}
              onChange={(event) => setContactNameDraft(event.target.value.slice(0, 80))}
              onKeyDown={(event) => { if (event.key === "Enter") saveContactName(); }}
              placeholder="e.g. Google Voice"
              className={`mt-5 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-emerald-400 ${theme.input}`}
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setContactNameOpen(false)} className={`flex-1 rounded-full border px-4 py-3 text-xs font-semibold ${theme.input}`}>Cancel</button>
              <button type="button" onClick={saveContactName} className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950">Save name</button>
            </div>
          </div>
        </div>
      )}
      {addNumberOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className={`w-full max-w-md rounded-t-[30px] border p-5 shadow-2xl sm:rounded-[28px] ${theme.panel}`}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Add NAVA SMS Number</h2>
                <p className={`mt-1 text-xs leading-relaxed ${theme.muted}`}>
                  Get another NAVA number for SMS. Once you add it, it will appear automatically in your Messages list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddNumberOpen(false)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg ${theme.soft}`}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={`mt-5 rounded-2xl border p-4 ${theme.soft}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-xl">📱</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">Choose a new number</p>
                  <p className={`mt-1 text-[10px] ${theme.muted}`}>
                    Browse countries, search numbers and add one to your NAVA Phone.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                href="/dashboard/sms"
                onClick={() => setAddNumberOpen(false)}
                className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <span>Get a new NAVA number</span>
                <span>›</span>
              </Link>
              <button
                type="button"
                onClick={refreshNumbers}
                className={`w-full rounded-2xl border px-4 py-3 text-xs font-semibold transition hover:border-emerald-400 hover:text-emerald-400 ${theme.input}`}
              >
                Refresh my numbers
              </button>
            </div>

            <p className={`mt-4 text-center text-[9px] ${theme.faint}`}>
              Numbers you already own stay together in the left Messages panel.
            </p>
          </div>
        </div>
      )}

      <div className="hidden lg:block">
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
    </div>
  );
}
