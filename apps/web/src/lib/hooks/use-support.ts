"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  AssignTicketInput,
  CreateSupportCategoryInput,
  CreateSupportTicketInput,
  CreateTicketCommentInput,
  PaginatedResponse,
  SupportCategory,
  SupportOverview,
  SupportTicket,
  SupportTicketDetail,
  TicketStatus,
  UpdateSupportCategoryInput,
  UpdateSupportTicketInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reconcileQueries } from "@/lib/query/optimistic";

export function useSupportOverview() {
  return useAsyncData(queryKeys.support.overview, () => apiFetch<SupportOverview>("/support/overview"), {
    staleTime: STALE.dashboard,
  });
}

export function useSupportTickets(params: {
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  categoryId?: string;
  page?: number;
}) {
  const { search, status, priority, source, categoryId, page } = params;
  return useAsyncData(
    [...queryKeys.support.tickets, search, status, priority, source, categoryId, page],
    () => {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status) query.set("status", status);
      if (priority) query.set("priority", priority);
      if (source) query.set("source", source);
      if (categoryId) query.set("categoryId", categoryId);
      if (page) query.set("page", String(page));
      const qs = query.toString();
      return apiFetch<PaginatedResponse<SupportTicket>>(`/support/tickets${qs ? `?${qs}` : ""}`);
    },
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useSupportTicket(id: string) {
  return useAsyncData(
    queryKeys.support.ticket(id),
    () => apiFetch<SupportTicketDetail>(`/support/tickets/${id}`),
    { staleTime: STALE.operational, keepPrevious: true }
  );
}

export function useSupportCategories(params: {
  search?: string;
  activeOnly?: boolean;
  page?: number;
}) {
  const { search, activeOnly, page } = params;
  return useAsyncData([...queryKeys.support.categories, search, activeOnly, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (activeOnly === true) query.set("activeOnly", "true");
    if (activeOnly === false) query.set("activeOnly", "false");
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<SupportCategory>>(
      `/support/categories${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.reference, keepPrevious: true });
}

export function useSupportCategory(id: string) {
  return useAsyncData(
    queryKeys.support.category(id),
    () => apiFetch<SupportCategory>(`/support/categories/${id}`),
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export async function createTicket(input: CreateSupportTicketInput): Promise<SupportTicketDetail> {
  return apiFetch<SupportTicketDetail>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus
): Promise<SupportTicketDetail> {
  return apiFetch<SupportTicketDetail>(`/support/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function assignTicket(
  id: string,
  input: AssignTicketInput
): Promise<SupportTicketDetail> {
  return apiFetch<SupportTicketDetail>(`/support/tickets/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addComment(
  ticketId: string,
  input: CreateTicketCommentInput
): Promise<SupportTicketDetail> {
  await apiFetch(`/support/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return apiFetch<SupportTicketDetail>(`/support/tickets/${ticketId}`);
}

export async function createCategory(input: CreateSupportCategoryInput): Promise<SupportCategory> {
  return apiFetch<SupportCategory>("/support/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTicket(
  id: string,
  input: UpdateSupportTicketInput
): Promise<SupportTicketDetail> {
  return apiFetch<SupportTicketDetail>(`/support/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string,
  input: UpdateSupportCategoryInput
): Promise<SupportCategory> {
  return apiFetch<SupportCategory>(`/support/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/support/categories/${id}`, { method: "DELETE" });
}

export function useCreateSupportTicket() {
  return useOptimisticCreateMutation<
    SupportTicketDetail,
    CreateSupportTicketInput,
    SupportTicketDetail
  >({
    mutationFn: createTicket,
    detailKey: (entity) => queryKeys.support.ticket(entity.id),
    listKeyPrefix: queryKeys.support.tickets,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}

export function useUpdateTicketStatus() {
  return useOptimisticEntityMutation<
    SupportTicketDetail,
    { id: string; status: TicketStatus },
    SupportTicketDetail
  >({
    mutationFn: ({ id, status }) => updateTicketStatus(id, status),
    detailKey: ({ id }) => queryKeys.support.ticket(id),
    listKeyPrefix: queryKeys.support.tickets,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, status }) => {
      assertMutationEntity(data, { id, status }, "updateTicketStatus");
    },
    optimisticUpdate: (current, { status }) => ({ ...current, status }),
    shouldKeepInList: keepIfMatchesStatusFilter,
  });
}

export function useAssignTicket() {
  return useOptimisticEntityMutation<
    SupportTicketDetail,
    { id: string; assignedToId: string | null },
    SupportTicketDetail
  >({
    mutationFn: ({ id, assignedToId }) => assignTicket(id, { assignedToId }),
    detailKey: ({ id }) => queryKeys.support.ticket(id),
    listKeyPrefix: queryKeys.support.tickets,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, assignedToId }) => {
      assertMutationEntity(data, { id, assignedToId }, "assignTicket");
    },
  });
}

/** Comment create uses response entity to patch detail (no separate page refetch). */
export function useAddTicketComment() {
  return useOptimisticEntityMutation<
    SupportTicketDetail,
    { id: string; body: string; isInternal?: boolean },
    SupportTicketDetail
  >({
    mutationFn: ({ id, body, isInternal }) => addComment(id, { body, isInternal }),
    detailKey: ({ id }) => queryKeys.support.ticket(id),
    getId: ({ id }) => id,
    toEntity: (data) => data,
  });
}

export function useCreateSupportCategory() {
  return useOptimisticCreateMutation<
    SupportCategory,
    CreateSupportCategoryInput,
    SupportCategory
  >({
    mutationFn: createCategory,
    detailKey: (entity) => queryKeys.support.category(entity.id),
    listKeyPrefix: queryKeys.support.categories,
    toEntity: (data) => data,
    reconcileKeys: (entity) => [
      queryKeys.support.category(entity.id),
      queryKeys.support.categories,
      queryKeys.support.overview,
    ],
  });
}

export function useUpdateSupportTicket() {
  return useOptimisticEntityMutation<
    SupportTicketDetail,
    { id: string; input: UpdateSupportTicketInput },
    SupportTicketDetail
  >({
    mutationFn: ({ id, input }) => updateTicket(id, input),
    detailKey: ({ id }) => queryKeys.support.ticket(id),
    listKeyPrefix: queryKeys.support.tickets,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.support.ticket(id),
      queryKeys.support.tickets,
      queryKeys.support.overview,
    ],
  });
}

export function useUpdateSupportCategory() {
  return useOptimisticEntityMutation<
    SupportCategory,
    { id: string; input: UpdateSupportCategoryInput },
    SupportCategory
  >({
    mutationFn: ({ id, input }) => updateCategory(id, input),
    detailKey: ({ id }) => queryKeys.support.category(id),
    listKeyPrefix: queryKeys.support.categories,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.support.category(id),
      queryKeys.support.categories,
      queryKeys.support.overview,
    ],
  });
}

export function useDeleteSupportCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteCategory(id),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.support.category(id) });
      reconcileQueries(queryClient, [
        queryKeys.support.categories,
        queryKeys.support.overview,
      ]);
    },
  });
}
