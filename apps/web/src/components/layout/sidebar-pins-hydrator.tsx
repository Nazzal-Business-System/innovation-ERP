"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useSidebarPinsStore } from "@/lib/sidebar-pins-store";

/** Loads / reconciles personal sidebar pins after auth is ready. */
export function SidebarPinsHydrator() {
  const authReady = useAuthStore((s) => s.authReady);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hydrateForUser = useSidebarPinsStore((s) => s.hydrateForUser);
  const resetSession = useSidebarPinsStore((s) => s.resetSession);

  useEffect(() => {
    if (!authReady || !userId) {
      if (!userId) resetSession();
      return;
    }
    void hydrateForUser(userId);
  }, [authReady, userId, hydrateForUser, resetSession]);

  return null;
}
