"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PaginatedResponse } from "@ierp/shared";

export type EntityWithId = { id: string };

export type ListSnapshot = Array<{ queryKey: QueryKey; data: unknown }>;

export function matchesQueryPrefix(queryKey: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length === 0) return true;
  if (prefix.length > queryKey.length) return false;
  return prefix.every((part, i) => Object.is(queryKey[i], part));
}

export function isPaginated<T>(value: unknown): value is PaginatedResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PaginatedResponse<T>).data) &&
    typeof (value as PaginatedResponse<T>).pagination === "object" &&
    (value as PaginatedResponse<T>).pagination !== null
  );
}

function isDataWrapper<T>(value: unknown): value is { data: T[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { data: T[] }).data) &&
    !("pagination" in (value as object))
  );
}

/** Knowledge-style flat pagination: `{ data, total, page, pageSize }`. */
function isFlatPaginated<T>(
  value: unknown
): value is { data: T[]; total: number; page: number; pageSize: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { data: T[] }).data) &&
    typeof (value as { total?: unknown }).total === "number" &&
    typeof (value as { page?: unknown }).page === "number" &&
    typeof (value as { pageSize?: unknown }).pageSize === "number" &&
    !("pagination" in (value as object))
  );
}

/** Snapshot list caches matching a key prefix (for rollback). */
export function snapshotListCaches(queryClient: QueryClient, listKeyPrefix: QueryKey): ListSnapshot {
  return queryClient
    .getQueryCache()
    .findAll({
      predicate: (q) => matchesQueryPrefix(q.queryKey, listKeyPrefix),
    })
    .map((q) => ({ queryKey: q.queryKey, data: q.state.data }));
}

export function restoreListCaches(queryClient: QueryClient, snapshot: ListSnapshot | undefined) {
  if (!snapshot) return;
  for (const entry of snapshot) {
    queryClient.setQueryData(entry.queryKey, entry.data);
  }
}

/**
 * Patch an entity inside every matching list cache (paginated, `{ data }`, or bare array).
 * When `shouldKeep` returns false the row is removed (e.g. archived / filtered out).
 */
export function patchEntityInLists<T extends EntityWithId>(
  queryClient: QueryClient,
  listKeyPrefix: QueryKey,
  id: string,
  updater: (item: T) => T,
  options?: {
    shouldKeep?: (item: T, queryKey: QueryKey) => boolean;
  }
): void {
  const queries = queryClient.getQueryCache().findAll({
    predicate: (q) => matchesQueryPrefix(q.queryKey, listKeyPrefix),
  });

  for (const query of queries) {
    const old = query.state.data;
    if (old == null) continue;

    if (isPaginated<T>(old)) {
      let changed = false;
      const nextData: T[] = [];
      for (const item of old.data) {
        if (item.id !== id) {
          nextData.push(item);
          continue;
        }
        changed = true;
        const updated = updater(item);
        if (options?.shouldKeep && !options.shouldKeep(updated, query.queryKey)) {
          continue;
        }
        nextData.push(updated);
      }
      if (!changed) continue;
      const removed = old.data.length - nextData.length;
      queryClient.setQueryData(query.queryKey, {
        ...old,
        data: nextData,
        pagination: removed
          ? {
              ...old.pagination,
              total: Math.max(0, old.pagination.total - removed),
            }
          : old.pagination,
      });
      continue;
    }

    if (isFlatPaginated<T>(old)) {
      let changed = false;
      const nextData: T[] = [];
      for (const item of old.data) {
        if (item.id !== id) {
          nextData.push(item);
          continue;
        }
        changed = true;
        const updated = updater(item);
        if (options?.shouldKeep && !options.shouldKeep(updated, query.queryKey)) {
          continue;
        }
        nextData.push(updated);
      }
      if (!changed) continue;
      const removed = old.data.length - nextData.length;
      queryClient.setQueryData(query.queryKey, {
        ...old,
        data: nextData,
        total: removed ? Math.max(0, old.total - removed) : old.total,
      });
      continue;
    }

    if (Array.isArray(old)) {
      const list = old as T[];
      let changed = false;
      const nextData: T[] = [];
      for (const item of list) {
        if (!item || typeof item !== "object" || !("id" in item) || item.id !== id) {
          nextData.push(item);
          continue;
        }
        changed = true;
        const updated = updater(item);
        if (options?.shouldKeep && !options.shouldKeep(updated, query.queryKey)) {
          continue;
        }
        nextData.push(updated);
      }
      if (changed) queryClient.setQueryData(query.queryKey, nextData);
      continue;
    }

    if (isDataWrapper<T>(old)) {
      let changed = false;
      const nextData: T[] = [];
      for (const item of old.data) {
        if (item.id !== id) {
          nextData.push(item);
          continue;
        }
        changed = true;
        const updated = updater(item);
        if (options?.shouldKeep && !options.shouldKeep(updated, query.queryKey)) {
          continue;
        }
        nextData.push(updated);
      }
      if (changed) queryClient.setQueryData(query.queryKey, { ...old, data: nextData });
    }
  }
}

/** Prepend a created entity onto first-page / unfiltered list caches when present. */
export function prependEntityToLists<T extends EntityWithId>(
  queryClient: QueryClient,
  listKeyPrefix: QueryKey,
  entity: T,
  options?: {
    shouldInclude?: (entity: T, queryKey: QueryKey) => boolean;
  }
): void {
  const queries = queryClient.getQueryCache().findAll({
    predicate: (q) => matchesQueryPrefix(q.queryKey, listKeyPrefix),
  });

  for (const query of queries) {
    if (options?.shouldInclude && !options.shouldInclude(entity, query.queryKey)) {
      continue;
    }
    const old = query.state.data;
    if (old == null) continue;

    if (isPaginated<T>(old)) {
      if (old.data.some((item) => item.id === entity.id)) continue;
      // Only mutate the first page so we don't invent rows on page 2+.
      if (old.pagination.page !== 1) continue;
      const nextTotal = old.pagination.total + 1;
      const pageSize = Math.max(1, old.pagination.limit);
      queryClient.setQueryData(query.queryKey, {
        ...old,
        data: [entity, ...old.data].slice(0, pageSize),
        pagination: {
          ...old.pagination,
          total: nextTotal,
          totalPages: Math.ceil(nextTotal / pageSize),
        },
      });
      continue;
    }

    if (isFlatPaginated<T>(old)) {
      if (old.data.some((item) => item.id === entity.id)) continue;
      // Only mutate the first page so we don't invent rows on page 2+.
      if (old.page !== 1) continue;
      const pageSize = Math.max(1, old.pageSize);
      const nextTotal = old.total + 1;
      queryClient.setQueryData(query.queryKey, {
        ...old,
        data: [entity, ...old.data].slice(0, pageSize),
        total: nextTotal,
      });
      continue;
    }

    if (Array.isArray(old)) {
      const list = old as T[];
      if (list.some((item) => item && typeof item === "object" && "id" in item && item.id === entity.id)) {
        continue;
      }
      queryClient.setQueryData(query.queryKey, [entity, ...list]);
      continue;
    }

    if (isDataWrapper<T>(old)) {
      if (old.data.some((item) => item.id === entity.id)) continue;
      queryClient.setQueryData(query.queryKey, { ...old, data: [entity, ...old.data] });
    }
  }
}

/** Soft-invalidate: mark stale and refetch active observers without clearing cache. */
export function reconcileQueries(queryClient: QueryClient, keys: QueryKey[]) {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
  }
}

/**
 * Read a status/stage filter from common list key shapes:
 * - `["mod", search, status, page]`
 * - `["mod", "list", { status }]`
 */
export function readStatusFilterFromKey(
  queryKey: QueryKey,
  field: "status" | "stage" = "status"
): string | undefined {
  for (const part of queryKey) {
    if (part && typeof part === "object" && !Array.isArray(part) && field in part) {
      const value = (part as Record<string, unknown>)[field];
      return typeof value === "string" && value.length > 0 ? value : undefined;
    }
  }
  // Positional: ["procurement-4", search, status, page]
  if (typeof queryKey[2] === "string" && queryKey[2].length > 0) {
    return queryKey[2];
  }
  return undefined;
}

export function keepIfMatchesStatusFilter<T extends { status: string }>(
  item: T,
  queryKey: QueryKey
): boolean {
  const filter = readStatusFilterFromKey(queryKey, "status");
  if (!filter) return true;
  return item.status === filter;
}

export function keepIfMatchesStageFilter<T extends { stage: string }>(
  item: T,
  queryKey: QueryKey
): boolean {
  const filter = readStatusFilterFromKey(queryKey, "stage");
  if (!filter) return true;
  return item.stage === filter;
}

/**
 * Knowledge articles list key:
 * `["knowledge-2", search, status, visibility, categoryId, page]`
 */
export function knowledgeArticleMatchesListFilters(
  entity: {
    title?: string;
    status?: string;
    visibility?: string;
    categoryId?: string | null;
  },
  queryKey: QueryKey,
  options?: { requireFirstPage?: boolean }
): boolean {
  const search = typeof queryKey[1] === "string" ? queryKey[1] : undefined;
  const status = typeof queryKey[2] === "string" ? queryKey[2] : undefined;
  const visibility = typeof queryKey[3] === "string" ? queryKey[3] : undefined;
  const categoryId = typeof queryKey[4] === "string" ? queryKey[4] : undefined;
  const page = typeof queryKey[5] === "number" ? queryKey[5] : 1;

  if (options?.requireFirstPage !== false && page !== 1) return false;
  if (status && entity.status !== status) return false;
  if (visibility && entity.visibility !== visibility) return false;
  if (categoryId && entity.categoryId !== categoryId) return false;
  if (search) {
    const q = search.toLowerCase();
    if (!(entity.title ?? "").toLowerCase().includes(q)) return false;
  }
  return true;
}

/** Keep/update helper — ignores page so middle pages are not wiped on edit. */
export function knowledgeArticleKeepInList(
  entity: {
    title?: string;
    status?: string;
    visibility?: string;
    categoryId?: string | null;
  },
  queryKey: QueryKey
): boolean {
  return knowledgeArticleMatchesListFilters(entity, queryKey, { requireFirstPage: false });
}
