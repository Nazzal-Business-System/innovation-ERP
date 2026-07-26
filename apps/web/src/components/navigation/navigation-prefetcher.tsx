"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getNavItemById } from "@ierp/shared";
import { prefetchShellWarmup } from "@/lib/navigation/route-prefetch";
import { useSidebarPinsStore } from "@/lib/sidebar-pins-store";

/**
 * After auth/shell readiness: warm likely destinations without a network storm.
 * Pinned sidebar items are prioritized; core module overviews follow with capped concurrency.
 */
export function NavigationPrefetcher({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ran = useRef(false);
  const pins = useSidebarPinsStore((s) => s.sidebarPins);

  useEffect(() => {
    if (!enabled || ran.current) return;
    ran.current = true;

    const pinnedHrefs = pins
      .map((p: { id: string }) => getNavItemById(p.id)?.href)
      .filter((href: string | undefined): href is string => Boolean(href));

    const idle = window.setTimeout(() => {
      void prefetchShellWarmup(router, queryClient, pinnedHrefs);
    }, 500);

    return () => window.clearTimeout(idle);
  }, [enabled, pins, queryClient, router]);

  return null;
}
