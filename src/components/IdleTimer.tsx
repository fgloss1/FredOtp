"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes

export default function IdleTimer() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Idle logout error:", e);
    }
    router.push("/login?reason=idle");
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Start 15-minute idle countdown
    resetTimer();

    // Reset countdown on any user activity
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, []);

  return null;
}