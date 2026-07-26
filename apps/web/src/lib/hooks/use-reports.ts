"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  FinancialSummaryReport,
  InventoryValuationReport,
  ProcurementSummaryReport,
  ProjectsSummaryReport,
  ReportsOverview,
  SalesSummaryReport,
  SupportSummaryReport,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";

export function useReportsOverview() {
  return useAsyncData(["reports-1"], () => apiFetch<ReportsOverview>("/reports/overview"), { staleTime: STALE.dashboard });
}

export function useSalesSummaryReport() {
  return useAsyncData(["reports-2"], () => apiFetch<SalesSummaryReport>("/reports/sales-summary"), { staleTime: STALE.operational });
}

export function useInventoryValuationReport() {
  return useAsyncData(["reports-3"], () => apiFetch<InventoryValuationReport>("/reports/inventory-valuation"), { staleTime: STALE.operational });
}

export function useProcurementSummaryReport() {
  return useAsyncData(["reports-4"], () => apiFetch<ProcurementSummaryReport>("/reports/procurement-summary"), { staleTime: STALE.operational });
}

export function useFinancialSummaryReport() {
  return useAsyncData(["reports-5"], () => apiFetch<FinancialSummaryReport>("/reports/financial-summary"), { staleTime: STALE.operational });
}

export function useProjectsSummaryReport() {
  return useAsyncData(["reports-6"], () => apiFetch<ProjectsSummaryReport>("/reports/projects-summary"), { staleTime: STALE.operational });
}

export function useSupportSummaryReport() {
  return useAsyncData(["reports-7"], () => apiFetch<SupportSummaryReport>("/reports/support-summary"), { staleTime: STALE.operational });
}
