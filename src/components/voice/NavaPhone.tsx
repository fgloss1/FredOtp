"use client";

import { useRef, useState } from "react";
import { TelnyxRTC } from "@telnyx/webrtc";

export default function NavaPhone() {
  const clientRef = useRef<TelnyxRTC | null>(null);
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

      setStatus("Connecting to Telnyx...");

      const client = new TelnyxRTC({
        credentials: {
          username: data.username,
          password: data.password,
        },
        useMic: true,
        useSpeaker: true,
      });

      client.remoteElement = "remoteMedia";

      client.on("ready", () => {
        setStatus("Connected to Telnyx");
      });

      client.on("registered", () => {
        setStatus("Registered with Telnyx");
      });

      client.on("socket.close", () => {
        clientRef.current = null;
        setStatus("Disconnected");
      });

      clientRef.current = client;

      await client.connect();
    } catch (error) {
      console.error("NAVA WebRTC connection failed:", error);
      clientRef.current = null;
      setStatus(
        error instanceof Error ? error.message : "Connection failed"
      );
    }
  }

  function disconnectPhone() {
    const client = clientRef.current;

    if (!client) {
      setStatus("Already disconnected");
      return;
    }

    client.disconnect();
    clientRef.current = null;
    setStatus("Disconnected");
  }

  return (
    <div>
      <h2>NAVA Phone</h2>

      <p>Status: {status}</p>

      <button onClick={connectPhone}>
        Connect Phone
      </button>

      <button onClick={disconnectPhone}>
        Disconnect
      </button>

      <audio id="remoteMedia" autoPlay />
    </div>
  );
}
