"use client";

import { useEffect } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 30 * 1000;
const LAST_ACTIVITY_KEY = "fredotp_last_activity";

export function IdleSessionGuard() {
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let loggingOut = false;

    const readLastActivity = () => {
      const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : Date.now();
    };

    let lastActivityAt = readLastActivity();

    const logoutForIdle = async () => {
      if (loggingOut) return;
      loggingOut = true;
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
          credentials: "same-origin",
        });
      } catch {
        // The redirect below still prevents continued use of the dashboard UI.
      } finally {
        window.location.replace("/login?reason=idle");
      }
    };

    const scheduleLogout = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const elapsed = Date.now() - lastActivityAt;
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed);
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
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleLogout();
    };

    if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
      void logoutForIdle();
      return;
    }

    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivityAt));
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

      lastActivityAt = readLastActivity();
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
  }, []);

  return null;
}
