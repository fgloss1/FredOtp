"use client";

import { useEffect, useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

const DEFAULT_DESTINATION = "+18052464223";

export default function NavaPhone() {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callRef = useRef<any>(null);
  const callerNumberRef = useRef<string>("");

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

      client.on("telnyx.error", (error: unknown) => {
        console.error("Telnyx WebRTC error:", error);

        if (error instanceof Error) {
          setStatus(`Telnyx error: ${error.message}`);
        } else {
          setStatus("Telnyx error");
        }
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

          case "active":
            setStatus("Call active");
            break;

          case "hangup":
            setStatus("Call ended");
            callRef.current = null;
            break;

          case "destroy":
          case "purge":
            callRef.current = null;
            setStatus("Call ended");
            break;

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

  function makeCall() {
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
      callRef.current = null;
      clientRef.current = null;
      setStatus("Disconnected");
    }
  }

  useEffect(() => {
    return () => {
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
