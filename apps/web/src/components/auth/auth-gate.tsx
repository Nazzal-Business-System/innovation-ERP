"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, useAuthStore } from "@/lib/auth-store";
import { DashboardSkeleton } from "@/components/feedback/dashboard-skeleton";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialized = useAuthStore((s) => s.initialized);
  const authReady = useAuthStore((s) => s.authReady);
  const loading = useAuthStore((s) => s.loading);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const restoreStarted = useRef(false);

  useEffect(() => {
    if (!initialized) return;

    const effectiveToken = getStoredToken();
    if (!effectiveToken) {
      router.replace("/login");
      return;
    }

    // Cached/login session already ready — do not block the shell.
    if (authReady || loading || restoreStarted.current) return;

    restoreStarted.current = true;
    void fetchMe().then((ok) => {
      restoreStarted.current = false;
      if (!ok) router.replace("/login");
    });
  }, [initialized, authReady, loading, fetchMe, router]);

  if (!initialized) {
    return <DashboardSkeleton />;
  }

  if (!getStoredToken()) {
    return <DashboardSkeleton />;
  }

  if (!authReady) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
}
