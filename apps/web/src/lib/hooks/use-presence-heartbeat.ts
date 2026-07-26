"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  type UserPresence,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "pointerdown", "touchstart", "scroll"] as const;
/** Local idle threshold before heartbeats report inactive (Away). */
const LOCAL_IDLE_MS = 5 * 60_000;

type HeartbeatResponse = {
  presence: UserPresence;
  serverTime: string;
  persisted: boolean;
};

/**
 * Sends throttled presence heartbeats while authenticated.
 * Pauses when the tab is hidden; resumes on focus/visibility.
 * Failures are non-blocking — UI falls back to Offline/Unknown.
 */
export function usePresenceHeartbeat(enabled: boolean) {
  const applyUserPatch = useAuthStore((s) => s.applyUserPatch);
  const lastActivityRef = useRef(Date.now());
  const inFlightRef = useRef(false);

  const send = useCallback(
    async (opts?: { active?: boolean; offline?: boolean }) => {
      if (inFlightRef.current) return;
      const { token, user, authReady } = useAuthStore.getState();
      if (!token || !authReady || !user) return;

      inFlightRef.current = true;
      try {
        const active =
          opts?.active ??
          (typeof document !== "undefined" &&
            document.visibilityState === "visible" &&
            Date.now() - lastActivityRef.current < LOCAL_IDLE_MS);

        const res = await apiFetch<HeartbeatResponse>("/auth/heartbeat", {
          method: "POST",
          body: JSON.stringify({
            active: opts?.offline ? false : active,
            offline: opts?.offline === true,
          }),
        });

        const current = useAuthStore.getState().user;
        if (current && res.presence) {
          applyUserPatch({
            ...current,
            lastSeenAt: res.presence.lastSeenAt,
            lastActiveAt: res.presence.lastActiveAt,
            presenceUpdatedAt: res.serverTime,
          });
        }
      } catch {
        /* non-blocking */
      } finally {
        inFlightRef.current = false;
      }
    },
    [applyUserPatch]
  );

  useEffect(() => {
    if (!enabled) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, markActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        markActivity();
        void send({ active: true });
      }
    };

    const onFocus = () => {
      markActivity();
      void send({ active: true });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    void send({ active: true });

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void send();
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, markActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [enabled, send]);

  return { sendHeartbeat: send };
}

export { markPresenceOffline } from "@/lib/presence-api";
