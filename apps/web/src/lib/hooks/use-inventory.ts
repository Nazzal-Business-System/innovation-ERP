"use client";

import type {
  CreateTransferInput,
  InventoryMovement,
  InventoryOverview,
  InventoryProduct,
  InventoryProductDetail,
  InventoryReservation,
  InventoryTransfer,
  InventoryWarehouse,
  MasterDataLifecycle,
  PaginatedResponse,
  SetLifecycleInput,
  UpdateProductInput,
  UpdateWarehouseInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { formatMoneyAmount } from "@/lib/form-utils";
import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useInventoryOverview() {
  return useAsyncData(
    queryKeys.inventory.overview,
    () => apiFetch<InventoryOverview>("/inventory/overview"),
    { staleTime: STALE.dashboard }
  );
}

export function useInventoryProducts(params: {
  search?: string;
  category?: string;
  status?: string;
  archived?: boolean;
  page?: number;
}) {
  const { search, category, status, archived, page = 1 } = params;
  return useAsyncData(
    queryKeys.inventory.products({ search, category, status, archived, page }),
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (category) query.set("category", category);
      if (status) query.set("status", status);
      if (archived !== undefined) query.set("archived", String(archived));
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<InventoryProduct>>(
        `/inventory/products${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useInventoryProduct(id: string) {
  return useAsyncData(
    queryKeys.inventory.product(id),
    () => apiFetch<InventoryProductDetail>(`/inventory/products/${id}`),
    { staleTime: STALE.operational }
  );
}

export function useInventoryWarehouses(params: { active?: boolean } = {}) {
  const { active } = params;
  return useAsyncData(
    [...queryKeys.inventory.warehouses, active],
    () => {
      const query = new URLSearchParams();
      if (active !== undefined) query.set("active", String(active));
      const qs = query.toString();
      return apiFetch<{ data: InventoryWarehouse[] }>(
        `/inventory/warehouses${qs ? `?${qs}` : ""}`
      ).then((r) => r.data);
    },
    { staleTime: STALE.reference }
  );
}

export type InventoryWarehouseDetail = InventoryWarehouse & MasterDataLifecycle & {
  stock: Array<{
    productId: string;
    sku: string;
    name: string;
    category?: string;
    quantityOnHand: number;
    quantityReserved: number;
    available: number;
    value?: string;
  }>;
  recentMovements: InventoryMovement[];
};

export function useInventoryWarehouse(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.inventory.warehouse(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as InventoryWarehouseDetail);
      return apiFetch<InventoryWarehouseDetail>(`/inventory/warehouses/${id}`);
    },
    { staleTime: STALE.reference, enabled }
  );
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  return apiFetch<InventoryProductDetail>(`/inventory/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useUpdateProduct() {
  return useOptimisticEntityMutation<
    InventoryProductDetail,
    { id: string; input: UpdateProductInput },
    InventoryProductDetail
  >({
    mutationFn: ({ id, input }) => updateProduct(id, input),
    detailKey: ({ id }) => queryKeys.inventory.product(id),
    listKeyPrefix: ["inventory", "products"],
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, input }) => {
      assertMutationEntity(
        data,
        {
          id,
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        "updateProduct"
      );
    },
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.costPrice !== undefined
        ? { costPrice: formatMoneyAmount(input.costPrice) }
        : {}),
      ...(input.sellPrice !== undefined
        ? { sellPrice: formatMoneyAmount(input.sellPrice) }
        : {}),
      ...(input.reorderLevel !== undefined ? { reorderLevel: input.reorderLevel } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.inventory.product(id),
      ["inventory", "products"],
      queryKeys.inventory.overview,
    ],
  });
}

export async function setProductLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<InventoryProductDetail>(`/inventory/products/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetProductLifecycle() {
  return useOptimisticEntityMutation<
    InventoryProductDetail,
    { id: string; active: boolean },
    InventoryProductDetail
  >({
    mutationFn: ({ id, active }) => setProductLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.inventory.product(id),
    listKeyPrefix: ["inventory", "products"],
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, active }) => {
      assertMutationEntity(
        data,
        { id, isArchived: !active },
        "setProductLifecycle"
      );
    },
    optimisticUpdate: (current, { active }) => ({
      ...current,
      isArchived: !active,
      ...(active
        ? { restoredAt: new Date().toISOString() }
        : { archivedAt: new Date().toISOString() }),
    }),
    shouldKeepInList: (item, queryKey) => {
      const params = queryKey[2];
      const archived =
        params && typeof params === "object"
          ? (params as Record<string, unknown>).archived
          : undefined;
      return typeof archived !== "boolean" || item.isArchived === archived;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.inventory.product(id),
      ["inventory", "products"],
      queryKeys.inventory.overview,
    ],
  });
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  return apiFetch<InventoryWarehouseDetail>(`/inventory/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useUpdateWarehouse() {
  return useOptimisticEntityMutation<
    InventoryWarehouseDetail,
    { id: string; input: UpdateWarehouseInput },
    InventoryWarehouseDetail
  >({
    mutationFn: ({ id, input }) => updateWarehouse(id, input),
    detailKey: ({ id }) => queryKeys.inventory.warehouse(id),
    listKeyPrefix: queryKeys.inventory.warehouses,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...input,
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.inventory.warehouse(id),
      queryKeys.inventory.warehouses,
      queryKeys.inventory.overview,
    ],
  });
}

export async function setWarehouseLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<InventoryWarehouseDetail>(`/inventory/warehouses/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetWarehouseLifecycle() {
  return useOptimisticEntityMutation<
    InventoryWarehouseDetail,
    { id: string; active: boolean },
    InventoryWarehouseDetail
  >({
    mutationFn: ({ id, active }) => setWarehouseLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.inventory.warehouse(id),
    listKeyPrefix: queryKeys.inventory.warehouses,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { active }) => ({
      ...current,
      isActive: active,
      ...(active
        ? { reactivatedAt: new Date().toISOString() }
        : { deactivatedAt: new Date().toISOString() }),
    }),
    shouldKeepInList: (item, queryKey) => {
      const activeFilter = queryKey[2];
      return typeof activeFilter !== "boolean" || item.isActive === activeFilter;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.inventory.warehouse(id),
      queryKeys.inventory.warehouses,
      queryKeys.inventory.overview,
    ],
  });
}

export function useInventoryMovements(params: { search?: string; page?: number }) {
  const { search, page = 1 } = params;
  return useAsyncData(
    ["inventory", "movements", { search, page }],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<InventoryMovement>>(
        `/inventory/movements${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useInventoryReservations(params: {
  search?: string;
  status?: string;
  page?: number;
}) {
  const { search, status, page = 1 } = params;
  return useAsyncData(
    ["inventory", "reservations", { search, status, page }],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<InventoryReservation>>(
        `/inventory/reservations${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useInventoryTransfers(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page = 1 } = params;
  return useAsyncData(
    [...queryKeys.inventory.transfers, { search, status, page }],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<InventoryTransfer>>(
        `/inventory/transfers${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useInventoryTransfer(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.inventory.transfer(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as InventoryTransfer);
      return apiFetch<InventoryTransfer>(`/inventory/transfers/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useInventoryReservation(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    ["inventory", "reservation", id],
    () => {
      if (!enabled) return Promise.resolve(null as unknown as InventoryReservation);
      return apiFetch<InventoryReservation>(`/inventory/reservations/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export async function createTransfer(input: CreateTransferInput) {
  return apiFetch<InventoryTransfer>("/inventory/transfers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeTransfer(id: string) {
  return apiFetch<InventoryTransfer>(`/inventory/transfers/${id}/complete`, {
    method: "PATCH",
  });
}

export function useCompleteTransfer() {
  return useOptimisticEntityMutation<InventoryTransfer, { id: string }, InventoryTransfer>({
    mutationFn: ({ id }) => completeTransfer(id),
    detailKey: ({ id }) => queryKeys.inventory.transfer(id),
    listKeyPrefix: queryKeys.inventory.transfers,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "COMPLETED",
      canComplete: false,
      completedDate: current.completedDate ?? new Date().toISOString().slice(0, 10),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.inventory.transfer(id),
      queryKeys.inventory.transfers,
    ],
  });
}

export function useCreateTransfer() {
  return useOptimisticCreateMutation<InventoryTransfer, CreateTransferInput, InventoryTransfer>({
    mutationFn: createTransfer,
    detailKey: (entity) => queryKeys.inventory.transfer(entity.id),
    listKeyPrefix: queryKeys.inventory.transfers,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}
