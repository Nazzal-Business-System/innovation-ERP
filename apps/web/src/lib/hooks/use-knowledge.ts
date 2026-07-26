"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateKnowledgeArticleInput,
  CreateKnowledgeCategoryInput,
  KnowledgeArticleDetail,
  KnowledgeCategory,
  KnowledgeOverview,
  KnowledgeSummaryReport,
  KnowledgeTagStat,
  PaginatedKnowledgeArticles,
  UpdateKnowledgeArticleInput,
  UpdateKnowledgeCategoryInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter, knowledgeArticleKeepInList, knowledgeArticleMatchesListFilters, reconcileQueries } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useKnowledgeOverview() {
  return useAsyncData(queryKeys.knowledge.overview, () => apiFetch<KnowledgeOverview>("/knowledge/overview"), { staleTime: STALE.dashboard });
}

export function useKnowledgeArticles(params: {
  search?: string;
  status?: string;
  visibility?: string;
  categoryId?: string;
  page?: number;
}) {
  const { search, status, visibility, categoryId, page } = params;
  return useAsyncData(["knowledge-2", search, status, visibility, categoryId, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (visibility) query.set("visibility", visibility);
    if (categoryId) query.set("categoryId", categoryId);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedKnowledgeArticles>(`/knowledge/articles${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.reference, keepPrevious: true });
}

export function useKnowledgeArticle(id: string) {
  return useAsyncData(queryKeys.knowledge.article(id), () => apiFetch<KnowledgeArticleDetail>(`/knowledge/articles/${id}`), { staleTime: STALE.operational });
}

export function useKnowledgeCategories(params?: { activeOnly?: boolean }) {
  return useAsyncData([...queryKeys.knowledge.categories, params?.activeOnly], () => {
    const query = new URLSearchParams();
    if (params?.activeOnly === true) query.set("activeOnly", "true");
    if (params?.activeOnly === false) query.set("activeOnly", "false");
    const qs = query.toString();
    return apiFetch<{ data: KnowledgeCategory[] }>(`/knowledge/categories${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.reference });
}

export function useKnowledgeCategory(id: string) {
  return useAsyncData(
    queryKeys.knowledge.category(id),
    () => apiFetch<KnowledgeCategory>(`/knowledge/categories/${id}`),
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useKnowledgeTags() {
  return useAsyncData(["knowledge-5"], () => apiFetch<{ data: KnowledgeTagStat[] }>("/knowledge/tags"), { staleTime: STALE.operational });
}

export function useKnowledgeArticlesByTicket(supportTicketId: string) {
  return useAsyncData(["knowledge-6", supportTicketId], () =>
      apiFetch<{ data: import("@ierp/shared").KnowledgeArticle[] }>(
        `/knowledge/articles/by-ticket?supportTicketId=${supportTicketId}`
      ), { staleTime: STALE.operational });
}

export function useKnowledgeSummaryReport() {
  return useAsyncData(["knowledge-7"], () => apiFetch<KnowledgeSummaryReport>("/reports/knowledge-summary"), { staleTime: STALE.operational });
}

export async function createKnowledgeArticle(input: CreateKnowledgeArticleInput) {
  return apiFetch<KnowledgeArticleDetail>("/knowledge/articles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function publishKnowledgeArticle(id: string) {
  return apiFetch<KnowledgeArticleDetail>(`/knowledge/articles/${id}/publish`, {
    method: "PATCH",
  });
}

export async function archiveKnowledgeArticle(id: string) {
  return apiFetch<KnowledgeArticleDetail>(`/knowledge/articles/${id}/archive`, {
    method: "PATCH",
  });
}

export async function restoreKnowledgeArticle(id: string) {
  return apiFetch<KnowledgeArticleDetail>(`/knowledge/articles/${id}/restore`, {
    method: "PATCH",
  });
}

export async function updateKnowledgeArticle(id: string, input: UpdateKnowledgeArticleInput) {
  return apiFetch<KnowledgeArticleDetail>(`/knowledge/articles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useCreateKnowledgeArticle() {
  return useOptimisticCreateMutation<
    KnowledgeArticleDetail,
    CreateKnowledgeArticleInput,
    KnowledgeArticleDetail
  >({
    mutationFn: createKnowledgeArticle,
    detailKey: (entity) => queryKeys.knowledge.article(entity.id),
    listKeyPrefix: queryKeys.knowledge.articles,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => knowledgeArticleMatchesListFilters(entity, queryKey),
    reconcileKeys: (entity) => [
      queryKeys.knowledge.article(entity.id),
      queryKeys.knowledge.articles,
      queryKeys.knowledge.categories,
      queryKeys.knowledge.overview,
    ],
  });
}

export function usePublishKnowledgeArticle() {
  return useOptimisticEntityMutation<
    KnowledgeArticleDetail,
    { id: string },
    KnowledgeArticleDetail
  >({
    mutationFn: ({ id }) => publishKnowledgeArticle(id),
    detailKey: ({ id }) => queryKeys.knowledge.article(id),
    listKeyPrefix: queryKeys.knowledge.articles,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "PUBLISHED",
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [queryKeys.knowledge.article(id), queryKeys.knowledge.articles],
  });
}

export function useArchiveKnowledgeArticle() {
  return useOptimisticEntityMutation<
    KnowledgeArticleDetail,
    { id: string },
    KnowledgeArticleDetail
  >({
    mutationFn: ({ id }) => archiveKnowledgeArticle(id),
    detailKey: ({ id }) => queryKeys.knowledge.article(id),
    listKeyPrefix: queryKeys.knowledge.articles,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "ARCHIVED",
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.knowledge.article(id),
      queryKeys.knowledge.articles,
      queryKeys.knowledge.overview,
    ],
  });
}

export function useRestoreKnowledgeArticle() {
  return useOptimisticEntityMutation<
    KnowledgeArticleDetail,
    { id: string },
    KnowledgeArticleDetail
  >({
    mutationFn: ({ id }) => restoreKnowledgeArticle(id),
    detailKey: ({ id }) => queryKeys.knowledge.article(id),
    listKeyPrefix: queryKeys.knowledge.articles,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "DRAFT",
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.knowledge.article(id),
      queryKeys.knowledge.articles,
      queryKeys.knowledge.overview,
    ],
  });
}

export function useUpdateKnowledgeArticle() {
  return useOptimisticEntityMutation<
    KnowledgeArticleDetail,
    { id: string; input: UpdateKnowledgeArticleInput },
    KnowledgeArticleDetail
  >({
    mutationFn: ({ id, input }) => updateKnowledgeArticle(id, input),
    detailKey: ({ id }) => queryKeys.knowledge.article(id),
    listKeyPrefix: queryKeys.knowledge.articles,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    }),
    shouldKeepInList: (entity, queryKey) => knowledgeArticleKeepInList(entity, queryKey),
    reconcileKeys: ({ id }) => [
      queryKeys.knowledge.article(id),
      queryKeys.knowledge.articles,
      queryKeys.knowledge.categories,
      queryKeys.knowledge.overview,
    ],
  });
}

export async function createKnowledgeCategory(input: CreateKnowledgeCategoryInput) {
  return apiFetch<KnowledgeCategory>("/knowledge/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateKnowledgeCategory(
  id: string,
  input: UpdateKnowledgeCategoryInput
): Promise<KnowledgeCategory> {
  return apiFetch<KnowledgeCategory>(`/knowledge/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteKnowledgeCategory(id: string): Promise<void> {
  return apiFetch<void>(`/knowledge/categories/${id}`, { method: "DELETE" });
}

export function useCreateKnowledgeCategory() {
  return useOptimisticCreateMutation<
    KnowledgeCategory,
    CreateKnowledgeCategoryInput,
    KnowledgeCategory
  >({
    mutationFn: createKnowledgeCategory,
    detailKey: (entity) => queryKeys.knowledge.category(entity.id),
    listKeyPrefix: queryKeys.knowledge.categories,
    toEntity: (data) => data,
    reconcileKeys: (entity) => [
      queryKeys.knowledge.category(entity.id),
      queryKeys.knowledge.categories,
      queryKeys.knowledge.overview,
    ],
  });
}

export function useUpdateKnowledgeCategory() {
  return useOptimisticEntityMutation<
    KnowledgeCategory,
    { id: string; input: UpdateKnowledgeCategoryInput },
    KnowledgeCategory
  >({
    mutationFn: ({ id, input }) => updateKnowledgeCategory(id, input),
    detailKey: ({ id }) => queryKeys.knowledge.category(id),
    listKeyPrefix: queryKeys.knowledge.categories,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.knowledge.category(id),
      queryKeys.knowledge.categories,
      queryKeys.knowledge.overview,
    ],
  });
}

export function useDeleteKnowledgeCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteKnowledgeCategory(id),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.knowledge.category(id) });
      reconcileQueries(queryClient, [
        queryKeys.knowledge.categories,
        queryKeys.knowledge.overview,
      ]);
    },
  });
}
