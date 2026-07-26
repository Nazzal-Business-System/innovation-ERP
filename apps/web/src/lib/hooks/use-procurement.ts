"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateVendorInput,
  PaginatedResponse,
  ProcurementOverview,
  ProcurementPurchaseOrder,
  ProcurementPurchaseOrderDetail,
  ProcurementVendor,
  ProcurementVendorDetail,
  SetLifecycleInput,
  UpdateVendorInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useProcurementOverview() {
  return useAsyncData(
    queryKeys.procurement.overview,
    () => apiFetch<ProcurementOverview>("/procurement/overview"),
    { staleTime: STALE.dashboard }
  );
}

export function useProcurementVendors(params: { search?: string; active?: boolean; page?: number }) {
  const { search, active, page } = params;
  return useAsyncData([...queryKeys.procurement.vendors, search, active, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (active !== undefined) query.set("active", String(active));
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<ProcurementVendor>>(
      `/procurement/vendors${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useProcurementVendor(id: string) {
  return useAsyncData(
    queryKeys.procurement.vendor(id),
    () => apiFetch<ProcurementVendorDetail>(`/procurement/vendors/${id}`),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export async function updateVendor(id: string, input: UpdateVendorInput) {
  return apiFetch<ProcurementVendorDetail>(`/procurement/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createVendor(input: CreateVendorInput) {
  return apiFetch<ProcurementVendorDetail>("/procurement/vendors", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function vendorMatchesListFilters(entity: ProcurementVendor, queryKey: readonly unknown[]): boolean {
  // ["procurement-2", search, active, page]
  const search = typeof queryKey[1] === "string" ? queryKey[1] : undefined;
  const active = typeof queryKey[2] === "boolean" ? queryKey[2] : undefined;
  const page = typeof queryKey[3] === "number" ? queryKey[3] : 1;
  if (page !== 1) return false;
  if (typeof active === "boolean" && entity.isActive !== active) return false;
  if (search) {
    const q = search.toLowerCase();
    const haystack = [entity.code, entity.name, entity.city, entity.contactName ?? "", entity.email ?? ""]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function useCreateVendor() {
  return useOptimisticCreateMutation<
    ProcurementVendorDetail,
    CreateVendorInput,
    ProcurementVendorDetail
  >({
    mutationFn: createVendor,
    detailKey: (entity) => queryKeys.procurement.vendor(entity.id),
    listKeyPrefix: queryKeys.procurement.vendors,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => vendorMatchesListFilters(entity, queryKey),
    reconcileKeys: (entity) => [
      queryKeys.procurement.vendor(entity.id),
      queryKeys.procurement.vendors,
      queryKeys.procurement.overview,
    ],
  });
}

export function useUpdateVendor() {
  return useOptimisticEntityMutation<
    ProcurementVendorDetail,
    { id: string; input: UpdateVendorInput },
    ProcurementVendorDetail
  >({
    mutationFn: ({ id, input }) => updateVendor(id, input),
    detailKey: ({ id }) => queryKeys.procurement.vendor(id),
    listKeyPrefix: queryKeys.procurement.vendors,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...input,
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.procurement.vendor(id),
      queryKeys.procurement.vendors,
      queryKeys.procurement.overview,
    ],
  });
}

export async function setVendorLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<ProcurementVendorDetail>(`/procurement/vendors/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetVendorLifecycle() {
  return useOptimisticEntityMutation<
    ProcurementVendorDetail,
    { id: string; active: boolean },
    ProcurementVendorDetail
  >({
    mutationFn: ({ id, active }) => setVendorLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.procurement.vendor(id),
    listKeyPrefix: queryKeys.procurement.vendors,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { active }) => ({
      ...current,
      isActive: active,
      ...(active
        ? { restoredAt: new Date().toISOString() }
        : { archivedAt: new Date().toISOString() }),
    }),
    shouldKeepInList: (item, queryKey) => {
      const activeFilter = queryKey[2];
      return typeof activeFilter !== "boolean" || item.isActive === activeFilter;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.procurement.vendor(id),
      queryKeys.procurement.vendors,
      queryKeys.procurement.overview,
    ],
  });
}

export function useProcurementPurchaseOrders(params: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const { search, status, page } = params;
  return useAsyncData([...queryKeys.procurement.purchaseOrders, search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<ProcurementPurchaseOrder>>(
      `/procurement/purchase-orders${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useProcurementPurchaseOrder(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(queryKeys.procurement.purchaseOrder(id), () => {
      if (!enabled) return Promise.resolve(null as unknown as ProcurementPurchaseOrderDetail);
      return apiFetch<ProcurementPurchaseOrderDetail>(`/procurement/purchase-orders/${id}`);
    }, { staleTime: STALE.operational, keepPrevious: true, enabled });
}

export type CreatePurchaseOrderInput = {
  vendorId: string;
  warehouseId: string;
  expectedDate?: string;
  notes?: string;
  lines: Array<{ productId: string; quantity: number; unitCost: number }>;
};

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return apiFetch<ProcurementPurchaseOrderDetail>("/procurement/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  return apiFetch<ProcurementPurchaseOrderDetail>(`/procurement/purchase-orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function useUpdatePurchaseOrderStatus() {
  return useOptimisticEntityMutation<
    ProcurementPurchaseOrderDetail,
    { id: string; status: string },
    ProcurementPurchaseOrderDetail
  >({
    mutationFn: ({ id, status }) => updatePurchaseOrderStatus(id, status),
    detailKey: ({ id }) => queryKeys.procurement.purchaseOrder(id),
    listKeyPrefix: queryKeys.procurement.purchaseOrders,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, status }) => {
      assertMutationEntity(
        data,
        { id, status: status as ProcurementPurchaseOrderDetail["status"] },
        "updatePurchaseOrderStatus"
      );
    },
    optimisticUpdate: (current, { status }) => ({
      ...current,
      status: status as ProcurementPurchaseOrderDetail["status"],
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.procurement.purchaseOrder(id),
      queryKeys.procurement.purchaseOrders,
    ],
  });
}

export function useCreatePurchaseOrder() {
  return useOptimisticCreateMutation<
    ProcurementPurchaseOrderDetail,
    CreatePurchaseOrderInput,
    ProcurementPurchaseOrderDetail
  >({
    mutationFn: createPurchaseOrder,
    detailKey: (entity) => queryKeys.procurement.purchaseOrder(entity.id),
    listKeyPrefix: queryKeys.procurement.purchaseOrders,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}
