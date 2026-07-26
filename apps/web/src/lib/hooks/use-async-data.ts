"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useApiQuery, STALE, type ApiQueryResult } from "@/lib/query/use-api-query";

/**
 * Drop-in replacement for the old per-module useAsyncData helpers.
 * Always pass a stable queryKey so TanStack Query can dedupe and cache.
 */
export function useAsyncData<T>(
  queryKey: QueryKey,
  loader: () => Promise<T>,
  options: {
    enabled?: boolean;
    staleTime?: number;
    keepPrevious?: boolean;
  } = {}
): ApiQueryResult<T> {
  return useApiQuery(queryKey, loader, {
    staleTime: options.staleTime ?? STALE.operational,
    keepPrevious: options.keepPrevious,
    enabled: options.enabled,
  });
}

export { STALE };
