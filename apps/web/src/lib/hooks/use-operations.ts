"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  OperationsDelivery,
  OperationsDeliveryDetail,
  OperationsGoodsReceipt,
  OperationsGoodsReceiptDetail,
  OperationsOverview,
  PaginatedResponse,
  ProcurementPurchaseOrderDetail,
  SalesOrderDetail,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useOperationsOverview() {
  return useAsyncData(
    queryKeys.operations.overview,
    () => apiFetch<OperationsOverview>("/operations/overview"),
    { staleTime: STALE.dashboard }
  );
}

export function useGoodsReceipts(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData([...queryKeys.operations.goodsReceipts, search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<OperationsGoodsReceipt>>(
      `/operations/goods-receipts${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useGoodsReceipt(id: string) {
  return useAsyncData(
    queryKeys.operations.goodsReceipt(id),
    () => apiFetch<OperationsGoodsReceiptDetail>(`/operations/goods-receipts/${id}`),
    { staleTime: STALE.operational }
  );
}

export function useDeliveries(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData([...queryKeys.operations.deliveries, search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<OperationsDelivery>>(
      `/operations/deliveries${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useDelivery(id: string) {
  return useAsyncData(
    queryKeys.operations.delivery(id),
    () => apiFetch<OperationsDeliveryDetail>(`/operations/deliveries/${id}`),
    { staleTime: STALE.operational }
  );
}

export async function receiveGoodsReceipt(id: string) {
  return apiFetch<OperationsGoodsReceiptDetail>(`/operations/goods-receipts/${id}/receive`, {
    method: "PATCH",
  });
}

export async function deliverDelivery(id: string) {
  return apiFetch<OperationsDeliveryDetail>(`/operations/deliveries/${id}/deliver`, {
    method: "PATCH",
  });
}

export type CreateGoodsReceiptInput = {
  purchaseOrderId: string;
  warehouseId?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    rejectedQuantity?: number;
    notes?: string;
  }>;
};

export type CreateDeliveryInput = {
  salesOrderId: string;
  warehouseId?: string;
  status?: "DRAFT" | "PICKED";
  notes?: string;
  lines: Array<{
    productId: string;
    orderedQuantity: number;
    deliveredQuantity: number;
    returnedQuantity?: number;
    notes?: string;
  }>;
};

export async function createGoodsReceipt(input: CreateGoodsReceiptInput) {
  return apiFetch<OperationsGoodsReceiptDetail>("/operations/goods-receipts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createDelivery(input: CreateDeliveryInput) {
  return apiFetch<OperationsDeliveryDetail>("/operations/deliveries", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useReceiveGoodsReceipt() {
  const queryClient = useQueryClient();
  return useOptimisticEntityMutation<
    OperationsGoodsReceiptDetail,
    { id: string },
    OperationsGoodsReceiptDetail
  >(
    {
      mutationFn: ({ id }) => receiveGoodsReceipt(id),
      detailKey: ({ id }) => queryKeys.operations.goodsReceipt(id),
      listKeyPrefix: queryKeys.operations.goodsReceipts,
      getId: ({ id }) => id,
      toEntity: (data) => data,
      optimisticUpdate: (current) => ({
        ...current,
        status: "RECEIVED",
        canReceive: false,
        receivedDate: current.receivedDate ?? new Date().toISOString().slice(0, 10),
        purchaseOrder: {
          ...current.purchaseOrder,
          status:
            current.purchaseOrder.status === "RECEIVED"
              ? current.purchaseOrder.status
              : "PARTIALLY_RECEIVED",
        },
        stockImpact: current.stockImpact.map((impact) => ({
          ...impact,
          movementType: impact.movementType ?? "RECEIPT",
        })),
      }),
      shouldKeepInList: keepIfMatchesStatusFilter,
      reconcileKeys: ({ id }) => [
        queryKeys.operations.goodsReceipt(id),
        queryKeys.operations.goodsReceipts,
        queryKeys.operations.overview,
        queryKeys.procurement.purchaseOrders,
        queryKeys.inventory.overview,
      ],
    },
    {
      onSuccess: (data) => {
        const poId = data.purchaseOrder?.id;
        if (!poId) return;
        const poKey = queryKeys.procurement.purchaseOrder(poId);
        const existing = queryClient.getQueryData<ProcurementPurchaseOrderDetail>(poKey);
        if (existing) {
          queryClient.setQueryData<ProcurementPurchaseOrderDetail>(poKey, {
            ...existing,
            status: data.purchaseOrder.status as ProcurementPurchaseOrderDetail["status"],
          });
        }
        void queryClient.invalidateQueries({ queryKey: poKey, refetchType: "active" });
      },
    }
  );
}

export function useDeliverDelivery() {
  const queryClient = useQueryClient();
  return useOptimisticEntityMutation<
    OperationsDeliveryDetail,
    { id: string },
    OperationsDeliveryDetail
  >(
    {
      mutationFn: ({ id }) => deliverDelivery(id),
      detailKey: ({ id }) => queryKeys.operations.delivery(id),
      listKeyPrefix: queryKeys.operations.deliveries,
      getId: ({ id }) => id,
      toEntity: (data) => data,
      optimisticUpdate: (current) => ({
        ...current,
        status: "DELIVERED",
        canDeliver: false,
        stockWarnings: [],
        deliveryDate: current.deliveryDate ?? new Date().toISOString().slice(0, 10),
        stockImpact: current.stockImpact.map((impact) => ({
          ...impact,
          movementType: impact.movementType ?? "ISSUE",
        })),
      }),
      shouldKeepInList: keepIfMatchesStatusFilter,
      reconcileKeys: ({ id }) => [
        queryKeys.operations.delivery(id),
        queryKeys.operations.deliveries,
        queryKeys.operations.overview,
        queryKeys.sales.orders,
        queryKeys.inventory.overview,
      ],
    },
    {
      onSuccess: (data) => {
        const soId = data.salesOrder?.id;
        if (!soId) return;
        const soKey = queryKeys.sales.order(soId);
        const existing = queryClient.getQueryData<SalesOrderDetail>(soKey);
        if (existing && data.salesOrder.status) {
          queryClient.setQueryData<SalesOrderDetail>(soKey, {
            ...existing,
            status: data.salesOrder.status as SalesOrderDetail["status"],
          });
        }
        void queryClient.invalidateQueries({ queryKey: soKey, refetchType: "active" });
      },
    }
  );
}

export function useCreateGoodsReceipt() {
  return useOptimisticCreateMutation<
    OperationsGoodsReceiptDetail,
    CreateGoodsReceiptInput,
    OperationsGoodsReceiptDetail
  >({
    mutationFn: createGoodsReceipt,
    detailKey: (entity) => queryKeys.operations.goodsReceipt(entity.id),
    listKeyPrefix: queryKeys.operations.goodsReceipts,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}

export function useCreateDelivery() {
  return useOptimisticCreateMutation<
    OperationsDeliveryDetail,
    CreateDeliveryInput,
    OperationsDeliveryDetail
  >({
    mutationFn: createDelivery,
    detailKey: (entity) => queryKeys.operations.delivery(entity.id),
    listKeyPrefix: queryKeys.operations.deliveries,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}
