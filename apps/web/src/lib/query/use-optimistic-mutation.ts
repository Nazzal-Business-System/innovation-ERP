"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  type EntityWithId,
  type ListSnapshot,
  patchEntityInLists,
  prependEntityToLists,
  reconcileQueries,
  restoreListCaches,
  snapshotListCaches,
} from "./optimistic";

export type OptimisticEntityMutationConfig<
  TData,
  TVariables,
  TEntity extends EntityWithId,
> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Detail query key for the affected entity. */
  detailKey: (variables: TVariables) => QueryKey;
  /** List query key prefix (e.g. `["procurement-4"]`). */
  listKeyPrefix?: QueryKey;
  getId: (variables: TVariables) => string;
  /** Map API response → cache entity (detail shape). */
  toEntity: (data: TData, variables: TVariables, previous: TEntity | undefined) => TEntity;
  /**
   * Apply an immediate optimistic patch to the current detail entity.
   * Prefer this for status / archive toggles.
   */
  optimisticUpdate?: (current: TEntity, variables: TVariables) => TEntity;
  /** Whether a patched list row should remain under the current filters. */
  shouldKeepInList?: (item: TEntity, queryKey: QueryKey) => boolean;
  /**
   * Extra keys to soft-invalidate after success (never session/nav/dashboard unless passed).
   * Detail + list prefix are included by default.
   */
  reconcileKeys?: (variables: TVariables) => QueryKey[];
  /** Skip background invalidate (when response fully replaces cache). Default false. */
  skipReconcile?: boolean;
  /**
   * After a 2xx response, assert critical fields before treating the mutation as success.
   * Throw to roll back optimistic state and skip success UI.
   */
  assertResponse?: (data: TData, variables: TVariables) => void;
};

type OptimisticContext<TEntity> = {
  detailKey: QueryKey;
  previousDetail: TEntity | undefined;
  previousLists: ListSnapshot | undefined;
};

/**
 * Shared optimistic update / rollback / reconcile pattern for entity mutations.
 * UI should use `isPending` for row/button pending only — never clear the page.
 */
export function useOptimisticEntityMutation<
  TData,
  TVariables,
  TEntity extends EntityWithId,
  TError = Error,
>(
  config: OptimisticEntityMutationConfig<TData, TVariables, TEntity>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, OptimisticContext<TEntity>>,
    "mutationFn" | "onMutate" | "onError" | "onSuccess" | "onSettled"
  > & {
    onSuccess?: (data: TData, variables: TVariables, context: OptimisticContext<TEntity> | undefined) => void;
    onError?: (error: TError, variables: TVariables, context: OptimisticContext<TEntity> | undefined) => void;
  }
): UseMutationResult<TData, TError, TVariables, OptimisticContext<TEntity>> {
  const queryClient = useQueryClient();
  const { onSuccess: userOnSuccess, onError: userOnError, ...rest } = options ?? {};

  return useMutation<TData, TError, TVariables, OptimisticContext<TEntity>>({
    ...rest,
    mutationFn: async (variables) => {
      const data = await config.mutationFn(variables);
      config.assertResponse?.(data, variables);
      return data;
    },
    onMutate: async (variables) => {
      const detailKey = config.detailKey(variables);
      const id = config.getId(variables);

      await queryClient.cancelQueries({ queryKey: detailKey });
      if (config.listKeyPrefix) {
        await queryClient.cancelQueries({
          predicate: (q) =>
            q.queryKey.length >= config.listKeyPrefix!.length &&
            config.listKeyPrefix!.every((part, i) => Object.is(q.queryKey[i], part)),
        });
      }

      const previousDetail = queryClient.getQueryData<TEntity>(detailKey);
      const previousLists = config.listKeyPrefix
        ? snapshotListCaches(queryClient, config.listKeyPrefix)
        : undefined;

      if (config.optimisticUpdate) {
        if (previousDetail) {
          const optimistic = config.optimisticUpdate(previousDetail, variables);
          queryClient.setQueryData(detailKey, optimistic);
          if (config.listKeyPrefix) {
            patchEntityInLists<TEntity>(
              queryClient,
              config.listKeyPrefix,
              id,
              () => optimistic,
              { shouldKeep: config.shouldKeepInList }
            );
          }
        } else if (config.listKeyPrefix) {
          // Detail not loaded (e.g. row action on a list page) — still patch list caches.
          patchEntityInLists<TEntity>(
            queryClient,
            config.listKeyPrefix,
            id,
            (item) => config.optimisticUpdate!(item, variables),
            { shouldKeep: config.shouldKeepInList }
          );
        }
      }

      return { detailKey, previousDetail, previousLists };
    },
    onError: (error, variables, context) => {
      if (context) {
        if (context.previousDetail !== undefined) {
          queryClient.setQueryData(context.detailKey, context.previousDetail);
        } else {
          queryClient.removeQueries({ queryKey: context.detailKey });
        }
        restoreListCaches(queryClient, context.previousLists);
      }
      userOnError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      const entity = config.toEntity(data, variables, context?.previousDetail);
      const detailKey = config.detailKey(variables);
      const id = config.getId(variables);
      queryClient.setQueryData(detailKey, entity);
      if (config.listKeyPrefix) {
        patchEntityInLists<TEntity>(
          queryClient,
          config.listKeyPrefix,
          id,
          () => entity,
          { shouldKeep: config.shouldKeepInList }
        );
      }
      userOnSuccess?.(data, variables, context);
    },
    onSettled: (_data, _error, variables) => {
      if (config.skipReconcile) return;
      const keys =
        config.reconcileKeys?.(variables) ??
        ([
          config.detailKey(variables),
          ...(config.listKeyPrefix ? [config.listKeyPrefix] : []),
        ] as QueryKey[]);
      reconcileQueries(queryClient, keys);
    },
  });
}

export type OptimisticCreateConfig<TData, TVariables, TEntity extends EntityWithId> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  detailKey: (entity: TEntity) => QueryKey;
  listKeyPrefix?: QueryKey;
  toEntity: (data: TData, variables: TVariables) => TEntity;
  shouldIncludeInList?: (entity: TEntity, queryKey: QueryKey) => boolean;
  reconcileKeys?: (entity: TEntity, variables: TVariables) => QueryKey[];
};

/** Create flow: seed detail (+ optional list) from the mutation response — no optimistic phantom rows. */
export function useOptimisticCreateMutation<
  TData,
  TVariables,
  TEntity extends EntityWithId,
  TError = Error,
>(
  config: OptimisticCreateConfig<TData, TVariables, TEntity>,
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, unknown>,
    "mutationFn" | "onSuccess" | "onSettled"
  > & {
    onSuccess?: (data: TData, variables: TVariables, entity: TEntity) => void;
  }
): UseMutationResult<TData, TError, TVariables, unknown> {
  const queryClient = useQueryClient();
  const { onSuccess: userOnSuccess, ...rest } = options ?? {};

  return useMutation<TData, TError, TVariables, unknown>({
    ...rest,
    mutationFn: config.mutationFn,
    onSuccess: (data, variables) => {
      const entity = config.toEntity(data, variables);
      queryClient.setQueryData(config.detailKey(entity), entity);
      if (config.listKeyPrefix) {
        prependEntityToLists(queryClient, config.listKeyPrefix, entity, {
          shouldInclude: config.shouldIncludeInList,
        });
      }
      const keys =
        config.reconcileKeys?.(entity, variables) ??
        ([
          config.detailKey(entity),
          ...(config.listKeyPrefix ? [config.listKeyPrefix] : []),
        ] as QueryKey[]);
      reconcileQueries(queryClient, keys);
      userOnSuccess?.(data, variables, entity);
    },
  });
}

/** Imperative helpers for one-off call sites that are not React mutation hooks. */
export async function runOptimisticStatusUpdate<TEntity extends EntityWithId>(
  queryClient: ReturnType<typeof useQueryClient>,
  options: {
    detailKey: QueryKey;
    listKeyPrefix?: QueryKey;
    id: string;
    optimisticPatch: (current: TEntity) => TEntity;
    mutate: () => Promise<TEntity>;
    shouldKeepInList?: (item: TEntity, queryKey: QueryKey) => boolean;
  }
): Promise<TEntity> {
  const { detailKey, listKeyPrefix, id, optimisticPatch, mutate, shouldKeepInList } = options;

  await queryClient.cancelQueries({ queryKey: detailKey });
  if (listKeyPrefix) {
    await queryClient.cancelQueries({
      predicate: (q) =>
        q.queryKey.length >= listKeyPrefix.length &&
        listKeyPrefix.every((part, i) => Object.is(q.queryKey[i], part)),
    });
  }

  const previousDetail = queryClient.getQueryData<TEntity>(detailKey);
  const previousLists = listKeyPrefix ? snapshotListCaches(queryClient, listKeyPrefix) : undefined;

  if (previousDetail) {
    const optimistic = optimisticPatch(previousDetail);
    queryClient.setQueryData(detailKey, optimistic);
    if (listKeyPrefix) {
      patchEntityInLists(queryClient, listKeyPrefix, id, () => optimistic, {
        shouldKeep: shouldKeepInList,
      });
    }
  }

  try {
    const result = await mutate();
    queryClient.setQueryData(detailKey, result);
    if (listKeyPrefix) {
      patchEntityInLists(queryClient, listKeyPrefix, id, () => result, {
        shouldKeep: shouldKeepInList,
      });
    }
    reconcileQueries(queryClient, [detailKey, ...(listKeyPrefix ? [listKeyPrefix] : [])]);
    return result;
  } catch (err) {
    if (previousDetail !== undefined) {
      queryClient.setQueryData(detailKey, previousDetail);
    }
    restoreListCaches(queryClient, previousLists);
    throw err;
  }
}
