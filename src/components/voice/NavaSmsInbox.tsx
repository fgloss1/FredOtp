"use client";

import { useCallback, useEffect, useState } from "react";
import { UiIcon } from "@/components/UiIcon";

type SmsMessage = {
  id: number;
  messageId: string;
  fromNumber: string;
  toNumber: string;
  text: string;
  otpCode: string | null;
  receivedAt: string;
};

export default function NavaSmsInbox() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/sms/messages", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load SMS messages.");
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load SMS messages."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();

    const timer = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadMessages]);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">SMS Inbox</h2>
          <p className="mt-1 text-sm text-slate-500">
            Incoming messages to your NAVA number appear here automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadMessages();
          }}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {loading && messages.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Loading messages...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-300">{error}</p>
      ) : messages.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center">
          <UiIcon name="message" className="h-7 w-7 text-slate-500" />
          <p className="mt-2 text-sm font-semibold text-white">No SMS yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Send a text to the NAVA number to test inbound messaging.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {messages.map((message) => (
            <article
              key={message.messageId}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-white">
                  {message.fromNumber}
                </p>
                <time className="text-xs text-slate-600">
                  {new Date(message.receivedAt).toLocaleString()}
                </time>
              </div>

              {message.otpCode ? (
                <div className="mt-3 inline-flex rounded-lg bg-emerald-400/10 px-3 py-2 font-mono text-lg font-black tracking-[0.25em] text-emerald-300 ring-1 ring-emerald-400/20">
                  {message.otpCode}
                </div>
              ) : null}

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                {message.text || "No text content"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
