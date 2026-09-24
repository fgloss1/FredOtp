"use client";

import { useEffect, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

const DEFAULT_DESTINATION = "+19727835097";

const DIAL_KEYS = [
  { value: "1", letters: "" },
  { value: "2", letters: "ABC" },
  { value: "3", letters: "DEF" },
  { value: "4", letters: "GHI" },
  { value: "5", letters: "JKL" },
  { value: "6", letters: "MNO" },
  { value: "7", letters: "PQRS" },
  { value: "8", letters: "TUV" },
  { value: "9", letters: "WXYZ" },
  { value: "*", letters: "" },
  { value: "0", letters: "+" },
  { value: "#", letters: "" },
];

function formatDialNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7,
    )}`;
  }

  return value || "Enter a number";
}

export default function NavaPhone() {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<any>(null);
  const callerNumberRef = useRef<string>("");
  const micStreamRef = useRef<MediaStream | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
  const [hasEditedNumber, setHasEditedNumber] = useState(false);
  const [status, setStatus] = useState("Ready");

  async function connectPhone() {
    if (clientRef.current) {
      setStatus("Already connected");
      return;
    }

    try {
      setStatus("Getting WebRTC credentials...");

      const response = await fetch("/api/voice/token", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get WebRTC credentials.");
      }

      if (!data.username || !data.password) {
        throw new Error("WebRTC credentials were not returned.");
      }

      callerNumberRef.current = data.callerNumber || "";

      setStatus("Connecting to Telnyx...");

      const client = new TelnyxRTC({
        login: data.username,
        password: data.password,
      });

      client.remoteElement = "remoteMedia";

      client.on("telnyx.ready", () => {
        setStatus("Ready to call");
      });

      client.on("telnyx.error", (event: any) => {
        console.error("Telnyx WebRTC error:", event);

        const error = event?.error ?? event;
        const code = error?.code ? ` [${error.code}]` : "";
        const message =
          error?.message || event?.errorMessage || "Telnyx WebRTC error";

        setStatus(`Telnyx error${code}: ${message}`);
      });

      client.on("telnyx.notification", (notification: any) => {
        console.log("Telnyx notification:", notification);

        if (notification?.type !== "callUpdate") {
          return;
        }

        const call = notification.call;

        if (!call) {
          return;
        }

        callRef.current = call;

        switch (call.state) {
          case "new":
            setStatus("Calling...");
            break;

          case "requesting":
            setStatus("Sending call...");
            break;

          case "trying":
            setStatus("Trying...");
            break;

          case "ringing":
            setStatus("Ringing...");
            break;

          case "active": {
            try {
              call.unmuteAudio();
            } catch (error) {
              console.warn("NAVA unmuteAudio warning:", error);
            }

            const micTrack =
              call.localStream?.getAudioTracks?.()[0] || null;

            const audioSender = call.peer?.instance
              ?.getSenders?.()
              .find(
                (sender: RTCRtpSender) => sender.track?.kind === "audio",
              );

            if (audioSender && micTrack && audioSender.track !== micTrack) {
              void audioSender
                .replaceTrack(micTrack)
                .then(() => {
                  console.log("NAVA AUDIO SENDER REBOUND", {
                    senderTrackId: audioSender.track?.id,
                    micTrackId: micTrack.id,
                  });
                })
                .catch((error: unknown) => {
                  console.warn("NAVA AUDIO SENDER REBIND WARNING:", error);
                });
            }

            const localTracks =
              call.localStream?.getAudioTracks?.() ||
              micStreamRef.current?.getAudioTracks?.() ||
              [];

            localTracks.forEach((track: MediaStreamTrack) => {
              track.enabled = true;
            });

            console.log("NAVA ACTIVE MICROPHONE", {
              tracks: localTracks.map((track: MediaStreamTrack) => ({
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
              })),
              micTrackId: micTrack?.id || null,
              senderTrackId: audioSender?.track?.id || null,
              isAudioMuted: call.isAudioMuted,
            });

            if (statsTimerRef.current) {
              clearInterval(statsTimerRef.current);
            }

            statsTimerRef.current = setInterval(async () => {
              try {
                const pc = call.peer?.instance;

                if (!pc) {
                  return;
                }

                const stats = await pc.getStats();
                const outboundAudio: any[] = [];
                const localAudioSource: any[] = [];
                const remoteInboundAudio: any[] = [];

                stats.forEach((report: any) => {
                  if (
                    report.type === "outbound-rtp" &&
                    report.kind === "audio"
                  ) {
                    outboundAudio.push({
                      bytesSent: report.bytesSent,
                      packetsSent: report.packetsSent,
                      ssrc: report.ssrc,
                      totalAudioEnergy: report.totalAudioEnergy,
                      totalSamplesSent: report.totalSamplesSent,
                      codecId: report.codecId,
                    });
                  }

                  if (
                    report.type === "media-source" &&
                    report.kind === "audio"
                  ) {
                    localAudioSource.push({
                      id: report.id,
                      trackIdentifier: report.trackIdentifier,
                      audioLevel: report.audioLevel,
                      totalAudioEnergy: report.totalAudioEnergy,
                      totalSamplesDuration: report.totalSamplesDuration,
                    });
                  }

                  if (
                    report.type === "remote-inbound-rtp" &&
                    report.kind === "audio"
                  ) {
                    remoteInboundAudio.push({
                      ssrc: report.ssrc,
                      packetsLost: report.packetsLost,
                      fractionLost: report.fractionLost,
                      roundTripTime: report.roundTripTime,
                    });
                  }
                });

                const micSource = localAudioSource[0] || {};
                const outbound = outboundAudio[0] || {};
                const remoteInbound = remoteInboundAudio[0] || {};

                console.log("NAVA AUDIO DIAGNOSTIC", {
                  micAudioLevel: micSource.audioLevel ?? null,
                  micTotalAudioEnergy: micSource.totalAudioEnergy ?? null,
                  micSamplesDuration: micSource.totalSamplesDuration ?? null,
                  senderBytesSent: outbound.bytesSent ?? null,
                  senderPacketsSent: outbound.packetsSent ?? null,
                  senderTotalAudioEnergy: outbound.totalAudioEnergy ?? null,
                  remotePacketsReceived: remoteInbound.packetsReceived ?? null,
                  remotePacketsLost: remoteInbound.packetsLost ?? null,
                  remoteFractionLost: remoteInbound.fractionLost ?? null,
                  remoteRoundTripTime: remoteInbound.roundTripTime ?? null,
                  senderTrackId: audioSender?.track?.id || null,
                  senderEnabled: audioSender?.track?.enabled ?? null,
                  senderReadyState: audioSender?.track?.readyState ?? null,
                });

                if (outboundAudio.length > 0) {
                  const totalBytes = outboundAudio.reduce(
                    (sum, item) => sum + (item.bytesSent || 0),
                    0,
                  );

                  setStatus(`Call active | audio sent ${totalBytes} bytes`);
                }
              } catch (error) {
                console.warn("NAVA RTP stats warning:", error);
              }
            }, 2000);

            setStatus("Call active | microphone ON");
            break;
          }

          case "hangup":
          case "destroy":
          case "purge":
          case "done": {
            const cause = call.cause || "unknown";
            const causeCode =
              call.causeCode !== undefined ? String(call.causeCode) : "n/a";
            const sipCode =
              call.sipCode !== undefined ? String(call.sipCode) : "n/a";
            const sipReason = call.sipReason || "n/a";

            console.info("NAVA CALL TERMINATION", {
              state: call.state,
              cause,
              causeCode,
              sipCode,
              sipReason,
              callId: call.id,
              destinationNumber: call.options?.destinationNumber,
              callerNumber: call.options?.callerNumber,
            });

            setStatus(
              `DONE | ${cause} | causeCode=${causeCode} | SIP=${sipCode} | ${sipReason}`,
            );

            if (statsTimerRef.current) {
              clearInterval(statsTimerRef.current);
              statsTimerRef.current = null;
            }

            callRef.current = null;
            break;
          }

          default:
            setStatus(`Call: ${call.state}`);
        }
      });

      clientRef.current = client;

      await client.connect();
    } catch (error) {
      console.error("NAVA WebRTC connection failed:", error);

      clientRef.current = null;

      setStatus(
        error instanceof Error ? error.message : "Connection failed",
      );
    }
  }

  async function makeCall() {
    const client = clientRef.current;

    if (!client) {
      setStatus("Connect the phone first");
      return;
    }

    const number = destination.trim();

    if (!number) {
      setStatus("Enter a destination number");
      return;
    }

    if (!callerNumberRef.current) {
      setStatus("Caller number is missing");
      return;
    }

    try {
      setStatus("Starting call...");

      const call = client.newCall({
        destinationNumber: number,
        callerNumber: callerNumberRef.current,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      callRef.current = call;
    } catch (error) {
      console.error("NAVA call failed:", error);

      setStatus(
        error instanceof Error ? error.message : "Unable to start call",
      );
    }
  }

  function hangUp() {
    const call = callRef.current;

    if (!call) {
      setStatus("No active call");
      return;
    }

    try {
      call.hangup();
      setStatus("Ending call...");
    } catch (error) {
      console.error("NAVA hangup failed:", error);
      setStatus("Unable to end call");
    }
  }

  function disconnectPhone() {
    const client = clientRef.current;

    if (!client) {
      setStatus("Already disconnected");
      return;
    }

    try {
      client.disconnect();
    } finally {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }

      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;

      callRef.current = null;
      clientRef.current = null;
      setStatus("Disconnected");
    }
  }

  function appendDigit(digit: string) {
    setHasEditedNumber(true);
    setDestination((current) => {
      if (!hasEditedNumber) {
        return digit;
      }

      return `${current}${digit}`.slice(0, 16);
    });
  }

  function handleNumberChange(value: string) {
    setHasEditedNumber(true);
    setDestination(value.slice(0, 16));
  }

  function backspace() {
    setHasEditedNumber(true);
    setDestination((current) => current.slice(0, -1));
  }

  function clearNumber() {
    setHasEditedNumber(true);
    setDestination("");
  }

  useEffect(() => {
    return () => {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }

      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;

      const client = clientRef.current;

      if (client) {
        try {
          client.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
      }
    };
  }, []);

  const isActive = status.includes("Call active");
  const canHangUp =
    isActive ||
    /Calling|Sending call|Trying|Ringing|Starting call|Ending call/.test(
      status,
    );
  const isBusy = /Getting|Connecting|Calling|Sending|Trying|Ringing|Starting/.test(
    status,
  );
  const statusLabel = isActive
    ? "In call"
    : status === "Ready to call" || status === "Ready"
      ? "Ready"
      : isBusy
        ? "Connecting"
        : status === "Disconnected"
          ? "Offline"
          : "Attention";

  return (
    <section className="overflow-hidden rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(31,210,180,0.12),_transparent_38%),linear-gradient(145deg,_rgba(15,27,49,0.98),_rgba(8,13,28,0.98))] p-3 shadow-2xl shadow-black/20 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950 shadow-lg shadow-cyan-400/20">
            ☎
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
              Web dialer
            </p>
            <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">
              NAVA Phone
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-slate-300">
          <span
            className={`h-2 w-2 rounded-full ${
              isActive
                ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                : isBusy
                  ? "animate-pulse bg-amber-300"
                  : "bg-slate-500"
            }`}
          />
          {statusLabel}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Dial number
        </p>
        <input
          value={destination}
          onChange={(event) => handleNumberChange(event.target.value)}
          placeholder="+1 (000) 000-0000"
          inputMode="tel"
          aria-label="Phone number"
          className="mt-2 w-full bg-transparent text-center text-xl font-black tracking-tight text-white outline-none placeholder:text-slate-700 sm:text-2xl"
        />
        <p className="mt-1 min-h-4 text-[11px] text-slate-500">
          {callerNumberRef.current
            ? `Calling from ${callerNumberRef.current}`
            : "Connect your phone to place calls"}
        </p>
      </div>

      <div className="mx-auto mt-2 grid max-w-[280px] grid-cols-3 gap-1.5">
        {DIAL_KEYS.map((key) => (
          <button
            key={key.value}
            type="button"
            onClick={() => appendDigit(key.value)}
            className="group flex h-11 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10 active:scale-95"
            aria-label={`Dial ${key.value}`}
          >
            <span className="text-lg font-bold">{key.value}</span>
            {key.letters ? (
              <span className="mt-0 text-[8px] font-bold tracking-[0.2em] text-slate-500 group-hover:text-cyan-200/70">
                {key.letters}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-2 flex max-w-[280px] items-center justify-between gap-2">
        <button
          type="button"
          onClick={clearNumber}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-white/5 hover:text-white"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={canHangUp ? hangUp : makeCall}
          disabled={isBusy && !canHangUp}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-xl transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            canHangUp
              ? "bg-rose-500 shadow-rose-500/25 hover:bg-rose-400"
              : "bg-emerald-400 shadow-emerald-400/25 hover:bg-emerald-300"
          }`}
          aria-label={canHangUp ? "Hang up" : "Place call"}
        >
          {canHangUp ? "●" : "☎"}
        </button>

        <button
          type="button"
          onClick={backspace}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Delete last digit"
        >
          ⌫ Delete
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
        <div>
          <p className="text-[11px] font-bold text-white">Phone connection</p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Telnyx WebRTC voice line
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={connectPhone}
            className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 transition hover:bg-cyan-300/20"
          >
            Connect
          </button>
          <button
            type="button"
            onClick={disconnectPhone}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            Disconnect
          </button>
        </div>
      </div>

      <p className="mt-1 truncate text-[10px] text-slate-500" title={status}>
        {status}
      </p>

      <audio id="remoteMedia" autoPlay />
    </section>
  );
}