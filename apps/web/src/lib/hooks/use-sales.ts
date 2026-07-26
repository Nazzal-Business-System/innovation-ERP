"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateCustomerInput,
  CustomerSort,
  PaginatedResponse,
  SalesCustomer,
  SalesCustomerDetail,
  SalesOrder,
  SalesOrderDetail,
  SalesOverview,
  SetLifecycleInput,
  UpdateCustomerInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { formatMoneyAmount } from "@/lib/form-utils";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useSalesOverview() {
  return useAsyncData(queryKeys.sales.overview, () => apiFetch<SalesOverview>("/sales/overview"), {
    staleTime: STALE.dashboard,
  });
}

export function useSalesCustomers(params: {
  search?: string;
  customerType?: string;
  active?: boolean;
  sort?: CustomerSort;
  pageSize?: number;
  page?: number;
}) {
  const {
    search,
    customerType,
    active,
    sort = "NEWEST",
    pageSize = 20,
    page,
  } = params;
  return useAsyncData(
    ["sales-2", search, customerType, active, sort, pageSize, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (customerType) query.set("customerType", customerType);
      if (active !== undefined) query.set("active", String(active));
      query.set("sort", sort);
      query.set("limit", String(pageSize));
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<SalesCustomer>>(
        `/sales/customers${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useSalesCustomer(id: string) {
  return useAsyncData(
    queryKeys.sales.customer(id),
    () => apiFetch<SalesCustomerDetail>(`/sales/customers/${id}`),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  return apiFetch<SalesCustomerDetail>(`/sales/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createCustomer(input: CreateCustomerInput) {
  return apiFetch<SalesCustomerDetail>("/sales/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function customerMatchesListFilters(entity: SalesCustomer, queryKey: readonly unknown[]): boolean {
  // query key: ["sales-2", search, customerType, active, sort, pageSize, page]
  const search = typeof queryKey[1] === "string" ? queryKey[1] : undefined;
  const customerType = typeof queryKey[2] === "string" ? queryKey[2] : undefined;
  const active = typeof queryKey[3] === "boolean" ? queryKey[3] : undefined;
  const sort = typeof queryKey[4] === "string" ? queryKey[4] : "NEWEST";
  const page = typeof queryKey[6] === "number" ? queryKey[6] : 1;

  if (page !== 1 || sort !== "NEWEST") return false;
  if (typeof active === "boolean" && entity.isActive !== active) return false;
  if (customerType && entity.customerType !== customerType) return false;
  if (search) {
    const q = search.toLowerCase();
    const haystack = [
      entity.code,
      entity.name,
      entity.city,
      entity.contactName ?? "",
      entity.email ?? "",
      entity.phone ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function useCreateCustomer() {
  return useOptimisticCreateMutation<
    SalesCustomerDetail,
    CreateCustomerInput,
    SalesCustomerDetail
  >({
    mutationFn: createCustomer,
    detailKey: (entity) => queryKeys.sales.customer(entity.id),
    listKeyPrefix: queryKeys.sales.customers,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => customerMatchesListFilters(entity, queryKey),
    reconcileKeys: (entity) => [
      queryKeys.sales.customer(entity.id),
      queryKeys.sales.customers,
      queryKeys.sales.overview,
    ],
  });
}

export function useUpdateCustomer() {
  return useOptimisticEntityMutation<
    SalesCustomerDetail,
    { id: string; input: UpdateCustomerInput },
    SalesCustomerDetail
  >({
    mutationFn: ({ id, input }) => updateCustomer(id, input),
    detailKey: ({ id }) => queryKeys.sales.customer(id),
    listKeyPrefix: queryKeys.sales.customers,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
      ...(input.creditLimit !== undefined
        ? { creditLimit: formatMoneyAmount(input.creditLimit) }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.sales.customer(id),
      queryKeys.sales.customers,
      queryKeys.sales.overview,
    ],
  });
}

export async function setCustomerLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<SalesCustomerDetail>(`/sales/customers/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetCustomerLifecycle() {
  return useOptimisticEntityMutation<
    SalesCustomerDetail,
    { id: string; active: boolean },
    SalesCustomerDetail
  >({
    mutationFn: ({ id, active }) => setCustomerLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.sales.customer(id),
    listKeyPrefix: queryKeys.sales.customers,
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
      const activeFilter = queryKey[3];
      return typeof activeFilter !== "boolean" || item.isActive === activeFilter;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.sales.customer(id),
      queryKeys.sales.customers,
      queryKeys.sales.overview,
    ],
  });
}

export function useSalesOrders(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData([...queryKeys.sales.orders, search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<SalesOrder>>(`/sales/orders${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useSalesOrder(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.sales.order(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as SalesOrderDetail);
      return apiFetch<SalesOrderDetail>(`/sales/orders/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export type CreateSalesOrderInput = {
  customerId: string;
  warehouseId: string;
  expectedDeliveryDate?: string;
  notes?: string;
  lines: Array<{ productId: string; quantity: number; unitPrice: number }>;
};

export async function createSalesOrder(input: CreateSalesOrderInput) {
  return apiFetch<SalesOrderDetail>("/sales/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateSalesOrderStatus(id: string, status: string) {
  return apiFetch<SalesOrderDetail>(`/sales/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function useUpdateSalesOrderStatus() {
  return useOptimisticEntityMutation<
    SalesOrderDetail,
    { id: string; status: string },
    SalesOrderDetail
  >({
    mutationFn: ({ id, status }) => updateSalesOrderStatus(id, status),
    detailKey: ({ id }) => queryKeys.sales.order(id),
    listKeyPrefix: queryKeys.sales.orders,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, status }) => {
      assertMutationEntity(
        data,
        { id, status: status as SalesOrderDetail["status"] },
        "updateSalesOrderStatus"
      );
    },
    optimisticUpdate: (current, { status }) => ({
      ...current,
      status: status as SalesOrderDetail["status"],
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [queryKeys.sales.order(id), queryKeys.sales.orders],
  });
}

export function useCreateSalesOrder() {
  return useOptimisticCreateMutation<
    SalesOrderDetail,
    CreateSalesOrderInput,
    SalesOrderDetail
  >({
    mutationFn: createSalesOrder,
    detailKey: (entity) => queryKeys.sales.order(entity.id),
    listKeyPrefix: queryKeys.sales.orders,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}
