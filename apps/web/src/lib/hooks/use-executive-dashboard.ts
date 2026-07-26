"use client";

import type { ExecutiveDashboardResponse } from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import { queryKeys } from "@/lib/query/client";

export function useExecutiveDashboard() {
  return useAsyncData(
    queryKeys.executiveDashboard,
    () => apiFetch<ExecutiveDashboardResponse>("/dashboard/executive"),
    { staleTime: STALE.dashboard }
  );
}
