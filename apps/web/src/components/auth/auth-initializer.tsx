"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePresenceHeartbeat } from "@/lib/hooks/use-presence-heartbeat";
import { useAuthStore } from "@/lib/auth-store";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);
  const authReady = useAuthStore((s) => s.authReady);
  const token = useAuthStore((s) => s.token);
  const revalidated = useRef(false);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (revalidated.current) return;
    revalidated.current = true;

    const { token: t, authReady: ready } = useAuthStore.getState();
    if (t && ready) {
      void fetchMe(true).then((ok) => {
        if (!ok) logout();
      });
    }
  }, [fetchMe, logout]);

  usePresenceHeartbeat(Boolean(token && authReady));

  return <>{children}</>;
}
