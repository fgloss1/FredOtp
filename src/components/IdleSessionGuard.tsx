"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export function IdleSessionGuard() {
  const router = useRouter();

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActivityAt = Date.now();
    let loggingOut = false;

    const logoutForIdle = async () => {
      if (loggingOut) return;
      loggingOut = true;

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
        });
      } finally {
        router.replace("/login?reason=idle");
        router.refresh();
      }
    };

    const resetTimer = () => {
      if (loggingOut) return;

      const now = Date.now();
      if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
      lastActivityAt = now;

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        void logoutForIdle();
      }, IDLE_TIMEOUT_MS);
    };

    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      void logoutForIdle();
    }, IDLE_TIMEOUT_MS);

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    for (const event of events) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    const handleVisibility = () => {
      if (!document.hidden) resetTimer();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      for (const event of events) {
        window.removeEventListener(event, resetTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return null;
}
