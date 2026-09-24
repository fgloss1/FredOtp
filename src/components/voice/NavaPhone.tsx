"use client";

import { useEffect, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

const DEFAULT_DESTINATION = "+18052464223";

export default function NavaPhone() {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<any>(null);
  const callerNumberRef = useRef<string>("");
  const micStreamRef = useRef<MediaStream | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [destination, setDestination] = useState(DEFAULT_DESTINATION);
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
        throw new Error(
          data.error || "Unable to get WebRTC credentials."
        );
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
          error?.message ||
          event?.errorMessage ||
          "Telnyx WebRTC error";

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
                (sender: RTCRtpSender) => sender.track?.kind === "audio"
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

                stats.forEach((report: any) => {
                  if (
                    report.type === "outbound-rtp" &&
                    report.kind === "audio"
                  ) {
                    outboundAudio.push({
                      bytesSent: report.bytesSent,
                      packetsSent: report.packetsSent,
                      ssrc: report.ssrc,
                    });
                  }
                });

                console.log("NAVA OUTBOUND AUDIO RTP", outboundAudio);

                if (outboundAudio.length > 0) {
                  const totalBytes = outboundAudio.reduce(
                    (sum, item) => sum + (item.bytesSent || 0),
                    0
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
              call.causeCode !== undefined
                ? String(call.causeCode)
                : "n/a";
            const sipCode =
              call.sipCode !== undefined
                ? String(call.sipCode)
                : "n/a";
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
              `DONE | ${cause} | causeCode=${causeCode} | SIP=${sipCode} | ${sipReason}`
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
        error instanceof Error
          ? error.message
          : "Connection failed"
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
        error instanceof Error
          ? error.message
          : "Unable to start call"
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

  return (
    <div className="space-y-4">
      <h2>NAVA Phone</h2>

      <p>Status: {status}</p>

      <input
        value={destination}
        onChange={(event) => setDestination(event.target.value)}
        placeholder="+1..."
        inputMode="tel"
      />

      <div className="flex gap-2">
        <button type="button" onClick={connectPhone}>
          Connect Phone
        </button>

        <button type="button" onClick={makeCall}>
          CALL
        </button>

        <button type="button" onClick={hangUp}>
          HANG UP
        </button>

        <button type="button" onClick={disconnectPhone}>
          Disconnect
        </button>
      </div>

      <audio id="remoteMedia" autoPlay />
    </div>
  );
}


