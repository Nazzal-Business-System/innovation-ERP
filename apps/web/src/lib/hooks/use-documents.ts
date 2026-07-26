"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateDocumentCategoryInput,
  CreateDocumentFileInput,
  CreateDocumentLinkInput,
  DocumentCategoriesListResponse,
  DocumentFileDetail,
  DocumentFilesListResponse,
  DocumentLinksListResponse,
  DocumentsOverview,
  DocumentsSummaryReport,
  DocumentCategory,
  DocumentModule,
  UpdateDocumentCategoryInput,
  UpdateDocumentFileInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter, reconcileQueries } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDocumentsOverview() {
  return useAsyncData(queryKeys.documents.overview, () => apiFetch<DocumentsOverview>("/documents/overview"), { staleTime: STALE.dashboard });
}

export function useDocumentFiles(params: {
  search?: string;
  status?: string;
  categoryId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  page?: number;
}) {
  const { search, status, categoryId, module, entityType, entityId, page } = params;
  return useAsyncData(["documents-2", search, status, categoryId, module, entityType, entityId, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (categoryId) query.set("categoryId", categoryId);
    if (module) query.set("module", module);
    if (entityType) query.set("entityType", entityType);
    if (entityId) query.set("entityId", entityId);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<DocumentFilesListResponse>(`/documents/files${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.reference, keepPrevious: true });
}

export function useDocumentFile(id: string) {
  return useAsyncData(queryKeys.documents.file(id), () => apiFetch<DocumentFileDetail>(`/documents/files/${id}`), { staleTime: STALE.operational });
}

export function useDocumentCategories(params: {
  search?: string;
  activeOnly?: boolean;
  page?: number;
}) {
  const { search, activeOnly, page } = params;
  return useAsyncData([...queryKeys.documents.categories, search, activeOnly, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (activeOnly === true) query.set("activeOnly", "true");
    if (activeOnly === false) query.set("activeOnly", "false");
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<DocumentCategoriesListResponse>(
      `/documents/categories${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.reference, keepPrevious: true });
}

export function useDocumentCategory(id: string) {
  return useAsyncData(
    queryKeys.documents.category(id),
    () => apiFetch<DocumentCategory>(`/documents/categories/${id}`),
    { staleTime: STALE.reference, keepPrevious: true }
  );
}

export function useDocumentLinks(params: {
  module?: DocumentModule;
  entityType?: string;
  entityId?: string;
  documentFileId?: string;
}) {
  const { module, entityType, entityId, documentFileId } = params;
  return useAsyncData(["documents-5", module, entityType, entityId, documentFileId], () => {
    const query = new URLSearchParams();
    if (module) query.set("module", module);
    if (entityType) query.set("entityType", entityType);
    if (entityId) query.set("entityId", entityId);
    if (documentFileId) query.set("documentFileId", documentFileId);
    const qs = query.toString();
    return apiFetch<DocumentLinksListResponse>(`/documents/links${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational });
}

export async function createDocumentFile(input: CreateDocumentFileInput): Promise<DocumentFileDetail> {
  return apiFetch<DocumentFileDetail>("/documents/files", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function archiveDocumentFile(id: string): Promise<DocumentFileDetail> {
  return apiFetch<DocumentFileDetail>(`/documents/files/${id}/archive`, {
    method: "PATCH",
  });
}

export async function restoreDocumentFile(id: string): Promise<DocumentFileDetail> {
  return apiFetch<DocumentFileDetail>(`/documents/files/${id}/restore`, {
    method: "PATCH",
  });
}

export async function updateDocumentFile(
  id: string,
  input: UpdateDocumentFileInput
): Promise<DocumentFileDetail> {
  return apiFetch<DocumentFileDetail>(`/documents/files/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useCreateDocumentFile() {
  return useOptimisticCreateMutation<
    DocumentFileDetail,
    CreateDocumentFileInput,
    DocumentFileDetail
  >({
    mutationFn: createDocumentFile,
    detailKey: (entity) => queryKeys.documents.file(entity.id),
    listKeyPrefix: queryKeys.documents.files,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}

export function useArchiveDocumentFile() {
  return useOptimisticEntityMutation<DocumentFileDetail, { id: string }, DocumentFileDetail>({
    mutationFn: ({ id }) => archiveDocumentFile(id),
    detailKey: ({ id }) => queryKeys.documents.file(id),
    listKeyPrefix: queryKeys.documents.files,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "ARCHIVED",
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.documents.file(id),
      queryKeys.documents.files,
      queryKeys.documents.overview,
    ],
  });
}

export function useRestoreDocumentFile() {
  return useOptimisticEntityMutation<DocumentFileDetail, { id: string }, DocumentFileDetail>({
    mutationFn: ({ id }) => restoreDocumentFile(id),
    detailKey: ({ id }) => queryKeys.documents.file(id),
    listKeyPrefix: queryKeys.documents.files,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current) => ({
      ...current,
      status: "ACTIVE",
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.documents.file(id),
      queryKeys.documents.files,
      queryKeys.documents.overview,
    ],
  });
}

export function useUpdateDocumentFile() {
  return useOptimisticEntityMutation<
    DocumentFileDetail,
    { id: string; input: UpdateDocumentFileInput },
    DocumentFileDetail
  >({
    mutationFn: ({ id, input }) => updateDocumentFile(id, input),
    detailKey: ({ id }) => queryKeys.documents.file(id),
    listKeyPrefix: queryKeys.documents.files,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.documents.file(id),
      queryKeys.documents.files,
      queryKeys.documents.categories,
      queryKeys.documents.overview,
    ],
  });
}

export async function createDocumentCategory(
  input: CreateDocumentCategoryInput
): Promise<DocumentCategory> {
  return apiFetch<DocumentCategory>("/documents/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateDocumentCategory(
  id: string,
  input: UpdateDocumentCategoryInput
): Promise<DocumentCategory> {
  return apiFetch<DocumentCategory>(`/documents/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteDocumentCategory(id: string): Promise<void> {
  return apiFetch<void>(`/documents/categories/${id}`, { method: "DELETE" });
}

export function useCreateDocumentCategory() {
  return useOptimisticCreateMutation<
    DocumentCategory,
    CreateDocumentCategoryInput,
    DocumentCategory
  >({
    mutationFn: createDocumentCategory,
    detailKey: (entity) => queryKeys.documents.category(entity.id),
    listKeyPrefix: queryKeys.documents.categories,
    toEntity: (data) => data,
    reconcileKeys: (entity) => [
      queryKeys.documents.category(entity.id),
      queryKeys.documents.categories,
      queryKeys.documents.overview,
    ],
  });
}

export function useUpdateDocumentCategory() {
  return useOptimisticEntityMutation<
    DocumentCategory,
    { id: string; input: UpdateDocumentCategoryInput },
    DocumentCategory
  >({
    mutationFn: ({ id, input }) => updateDocumentCategory(id, input),
    detailKey: ({ id }) => queryKeys.documents.category(id),
    listKeyPrefix: queryKeys.documents.categories,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    }),
    reconcileKeys: ({ id }) => [
      queryKeys.documents.category(id),
      queryKeys.documents.categories,
      queryKeys.documents.overview,
    ],
  });
}

export function useDeleteDocumentCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteDocumentCategory(id),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.documents.category(id) });
      reconcileQueries(queryClient, [
        queryKeys.documents.categories,
        queryKeys.documents.overview,
      ]);
    },
  });
}

export async function createDocumentLink(input: CreateDocumentLinkInput) {
  return apiFetch("/documents/links", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteDocumentLink(id: string) {
  return apiFetch<void>(`/documents/links/${id}`, {
    method: "DELETE",
  });
}

export function useCreateDocumentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDocumentLink,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.links });
      void queryClient.invalidateQueries({
        queryKey: [
          "documents-5",
          variables.module,
          variables.entityType,
          variables.entityId,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.files });
    },
  });
}

export function useDeleteDocumentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; module: DocumentModule; entityType: string; entityId: string }) =>
      deleteDocumentLink(id),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.links });
      void queryClient.invalidateQueries({
        queryKey: [
          "documents-5",
          variables.module,
          variables.entityType,
          variables.entityId,
        ],
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.files });
    },
  });
}

export function useDocumentsSummaryReport() {
  return useAsyncData(["documents-6"], () => apiFetch<DocumentsSummaryReport>("/reports/documents-summary"), { staleTime: STALE.operational });
}
