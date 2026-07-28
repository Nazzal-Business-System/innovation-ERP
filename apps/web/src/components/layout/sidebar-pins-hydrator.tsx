"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useSidebarPinsStore } from "@/lib/sidebar-pins-store";

/** Loads / reconciles personal sidebar pins after auth is ready; drops inaccessible pins. */
export function SidebarPinsHydrator() {
  const authReady = useAuthStore((s) => s.authReady);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const permissions = useAuthStore((s) => s.permissions);
  const hydrateForUser = useSidebarPinsStore((s) => s.hydrateForUser);
  const resetSession = useSidebarPinsStore((s) => s.resetSession);
  const pruneInaccessiblePins = useSidebarPinsStore((s) => s.pruneInaccessiblePins);
  const hydrated = useSidebarPinsStore((s) => s.hydrated);

  useEffect(() => {
    if (!authReady || !userId) {
      if (!userId) resetSession();
      return;
    }
    void hydrateForUser(userId);
  }, [authReady, userId, hydrateForUser, resetSession]);

  useEffect(() => {
    if (!authReady || !userId || !hydrated) return;
    pruneInaccessiblePins(permissions);
  }, [authReady, userId, hydrated, permissions, pruneInaccessiblePins]);

  return null;
}
