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

    const scheduleLogout = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt));
      idleTimer = setTimeout(() => {
        if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
          void logoutForIdle();
        } else {
          scheduleLogout();
        }
      }, remaining);
    };

    const recordActivity = () => {
      if (loggingOut) return;

      const now = Date.now();
      if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
      lastActivityAt = now;
      scheduleLogout();
    };

    scheduleLogout();

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    for (const event of events) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    const handleVisibility = () => {
      if (document.hidden || loggingOut) return;

      if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        void logoutForIdle();
        return;
      }

      scheduleLogout();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      for (const event of events) {
        window.removeEventListener(event, recordActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return null;
}
