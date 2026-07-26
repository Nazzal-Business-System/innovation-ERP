"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  FinanceAgingReport,
  FinanceCustomerInvoice,
  FinanceCustomerInvoiceDetail,
  FinanceCustomerPayment,
  FinanceCustomerPaymentDetail,
  FinanceOverview,
  FinanceVendorBill,
  FinanceVendorBillDetail,
  FinanceVendorPayment,
  FinanceVendorPaymentDetail,
  PaginatedResponse,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useFinanceOverview() {
  return useAsyncData(queryKeys.finance.overview, () => apiFetch<FinanceOverview>("/finance/overview"), {
    staleTime: STALE.dashboard,
  });
}

export function useCustomerInvoices(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData(
    [...queryKeys.finance.customerInvoices, search, status, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<FinanceCustomerInvoice>>(
        `/finance/customer-invoices${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useCustomerInvoice(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.finance.customerInvoice(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as FinanceCustomerInvoiceDetail);
      return apiFetch<FinanceCustomerInvoiceDetail>(`/finance/customer-invoices/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useCustomerPayments(params: { search?: string; page?: number }) {
  const { search, page } = params;
  return useAsyncData(
    [...queryKeys.finance.customerPayments, search, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<FinanceCustomerPayment>>(
        `/finance/customer-payments${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useCustomerPayment(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.finance.customerPayment(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as FinanceCustomerPaymentDetail);
      return apiFetch<FinanceCustomerPaymentDetail>(`/finance/customer-payments/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useVendorBills(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData(
    [...queryKeys.finance.vendorBills, search, status, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<FinanceVendorBill>>(
        `/finance/vendor-bills${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useVendorBill(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.finance.vendorBill(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as FinanceVendorBillDetail);
      return apiFetch<FinanceVendorBillDetail>(`/finance/vendor-bills/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useVendorPayments(params: { search?: string; page?: number }) {
  const { search, page } = params;
  return useAsyncData(
    [...queryKeys.finance.vendorPayments, search, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<FinanceVendorPayment>>(
        `/finance/vendor-payments${qs ? `?${qs}` : ""}`
      );
    },
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useVendorPayment(id: string) {
  const enabled = Boolean(id && id.length > 8);
  return useAsyncData(
    queryKeys.finance.vendorPayment(id),
    () => {
      if (!enabled) return Promise.resolve(null as unknown as FinanceVendorPaymentDetail);
      return apiFetch<FinanceVendorPaymentDetail>(`/finance/vendor-payments/${id}`);
    },
    { staleTime: STALE.operational, enabled }
  );
}

export function useArAging() {
  return useAsyncData(
    queryKeys.finance.arAging,
    () => apiFetch<FinanceAgingReport>("/finance/ar-aging"),
    { staleTime: STALE.operational }
  );
}

export function useApAging() {
  return useAsyncData(
    queryKeys.finance.apAging,
    () => apiFetch<FinanceAgingReport>("/finance/ap-aging"),
    { staleTime: STALE.operational }
  );
}

export async function sendCustomerInvoice(id: string) {
  return apiFetch<FinanceCustomerInvoiceDetail>(`/finance/customer-invoices/${id}/send`, {
    method: "PATCH",
  });
}

export async function receiveVendorBill(id: string) {
  return apiFetch<FinanceVendorBillDetail>(`/finance/vendor-bills/${id}/receive`, {
    method: "PATCH",
  });
}

export type CreateCustomerPaymentInput = {
  customerInvoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
};

export type CreateVendorPaymentInput = {
  vendorBillId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  reference?: string;
  notes?: string;
};

export async function createCustomerPayment(input: CreateCustomerPaymentInput) {
  return apiFetch<FinanceCustomerPayment>("/finance/customer-payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createVendorPayment(input: CreateVendorPaymentInput) {
  return apiFetch<FinanceVendorPayment>("/finance/vendor-payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useSendCustomerInvoice() {
  return useOptimisticEntityMutation<
    FinanceCustomerInvoiceDetail,
    { id: string },
    FinanceCustomerInvoiceDetail
  >({
    mutationFn: ({ id }) => sendCustomerInvoice(id),
    detailKey: ({ id }) => queryKeys.finance.customerInvoice(id),
    listKeyPrefix: queryKeys.finance.customerInvoices,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "SENT",
      canSend: false,
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
  });
}

export function useReceiveVendorBill() {
  return useOptimisticEntityMutation<
    FinanceVendorBillDetail,
    { id: string },
    FinanceVendorBillDetail
  >({
    mutationFn: ({ id }) => receiveVendorBill(id),
    detailKey: ({ id }) => queryKeys.finance.vendorBill(id),
    listKeyPrefix: queryKeys.finance.vendorBills,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "RECEIVED",
      canReceive: false,
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
  });
}

export function useCreateCustomerPayment() {
  return useOptimisticCreateMutation<
    FinanceCustomerPayment,
    CreateCustomerPaymentInput,
    FinanceCustomerPayment
  >({
    mutationFn: createCustomerPayment,
    detailKey: (entity) => queryKeys.finance.customerPayment(entity.id),
    listKeyPrefix: queryKeys.finance.customerPayments,
    toEntity: (data) => data,
    reconcileKeys: (_entity, vars) => [
      queryKeys.finance.customerPayments,
      queryKeys.finance.customerInvoices,
      queryKeys.finance.customerInvoice(vars.customerInvoiceId),
      queryKeys.finance.arAging,
      queryKeys.finance.overview,
    ],
  });
}

export function useCreateVendorPayment() {
  return useOptimisticCreateMutation<
    FinanceVendorPayment,
    CreateVendorPaymentInput,
    FinanceVendorPayment
  >({
    mutationFn: createVendorPayment,
    detailKey: (entity) => queryKeys.finance.vendorPayment(entity.id),
    listKeyPrefix: queryKeys.finance.vendorPayments,
    toEntity: (data) => data,
    reconcileKeys: (_entity, vars) => [
      queryKeys.finance.vendorPayments,
      queryKeys.finance.vendorBills,
      queryKeys.finance.vendorBill(vars.vendorBillId),
      queryKeys.finance.apAging,
      queryKeys.finance.overview,
    ],
  });
}
