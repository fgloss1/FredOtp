"use client";

import { useState } from "react";

export default function NavaPhone() {
  const [status, setStatus] = useState("Ready");

  async function startCall() {
    setStatus("Requesting token...");

    const res = await fetch("/api/voice/token");
    const data = await res.json();

    if (!res.ok) {
      setStatus("Token error");
      return;
    }

    console.log("TOKEN RECEIVED", data);
    setStatus("Token received");
  }

  return (
    <div>
      <h2>NAVA Phone</h2>

      <p>Status: {status}</p>

      <button onClick={startCall}>
        Start Call
      </button>
    </div>
  );
}