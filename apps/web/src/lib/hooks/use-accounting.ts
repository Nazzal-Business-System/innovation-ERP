"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  AccountingAccount,
  AccountingAccountDetail,
  AccountingOverview,
  JournalEntry,
  JournalEntryDetail,
  PaginatedResponse,
  SetLifecycleInput,
  TrialBalance,
  UpdateAccountInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import { useOptimisticEntityMutation } from "@/lib/query/use-optimistic-mutation";

export function useAccountingOverview() {
  return useAsyncData(["accounting-1"], () => apiFetch<AccountingOverview>("/accounting/overview"), { staleTime: STALE.dashboard });
}

export function useAccountingAccounts(params: {
  search?: string;
  type?: string;
  active?: boolean;
  page?: number;
}) {
  const { search, type, active, page } = params;
  return useAsyncData([...queryKeys.accounting.accounts, search, type, active, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (type) query.set("type", type);
    if (active !== undefined) query.set("active", String(active));
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<AccountingAccount>>(`/accounting/accounts${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useAccountingAccount(id: string) {
  return useAsyncData(
    queryKeys.accounting.account(id),
    () => apiFetch<AccountingAccountDetail>(`/accounting/accounts/${id}`),
    { staleTime: STALE.operational }
  );
}

export async function updateAccount(id: string, input: UpdateAccountInput) {
  return apiFetch<AccountingAccountDetail>(`/accounting/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useUpdateAccount() {
  return useOptimisticEntityMutation<
    AccountingAccountDetail,
    { id: string; input: UpdateAccountInput },
    AccountingAccountDetail
  >({
    mutationFn: ({ id, input }) => updateAccount(id, input),
    detailKey: ({ id }) => queryKeys.accounting.account(id),
    listKeyPrefix: queryKeys.accounting.accounts,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...input,
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.accounting.account(id),
      queryKeys.accounting.accounts,
    ],
  });
}

export async function setAccountLifecycle(id: string, input: SetLifecycleInput) {
  return apiFetch<AccountingAccountDetail>(`/accounting/accounts/${id}/lifecycle`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useSetAccountLifecycle() {
  return useOptimisticEntityMutation<
    AccountingAccountDetail,
    { id: string; active: boolean },
    AccountingAccountDetail
  >({
    mutationFn: ({ id, active }) => setAccountLifecycle(id, { active }),
    detailKey: ({ id }) => queryKeys.accounting.account(id),
    listKeyPrefix: queryKeys.accounting.accounts,
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
      const activeFilter = queryKey[3];
      return typeof activeFilter !== "boolean" || item.isActive === activeFilter;
    },
    reconcileKeys: ({ id }) => [
      queryKeys.accounting.account(id),
      queryKeys.accounting.accounts,
    ],
  });
}

export function useJournalEntries(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData([...queryKeys.accounting.journalEntries, search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<JournalEntry>>(`/accounting/journal-entries${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useJournalEntry(id: string) {
  return useAsyncData(
    queryKeys.accounting.journalEntry(id),
    () => apiFetch<JournalEntryDetail>(`/accounting/journal-entries/${id}`),
    { staleTime: STALE.operational }
  );
}

export async function postJournalEntry(id: string) {
  return apiFetch<JournalEntryDetail>(`/accounting/journal-entries/${id}/post`, {
    method: "PATCH",
  });
}

export function usePostJournalEntry() {
  return useOptimisticEntityMutation<
    JournalEntryDetail,
    { id: string },
    JournalEntryDetail
  >({
    mutationFn: ({ id }) => postJournalEntry(id),
    detailKey: ({ id }) => queryKeys.accounting.journalEntry(id),
    listKeyPrefix: queryKeys.accounting.journalEntries,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "POSTED",
      canPost: false,
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.accounting.journalEntry(id),
      queryKeys.accounting.journalEntries,
      queryKeys.accounting.accounts,
    ],
  });
}

export function useTrialBalance(type?: string) {
  return useAsyncData(["accounting-6", type], () => {
    const query = new URLSearchParams();
    if (type) query.set("type", type);
    const qs = query.toString();
    return apiFetch<TrialBalance>(`/accounting/trial-balance${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational });
}
