"use client";

import {
  useQuery,
  keepPreviousData,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";
import { STALE } from "./client";

export type ApiQueryResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
  isFetching: boolean;
  isPlaceholderData: boolean;
};

type UseApiQueryOptions<T> = {
  enabled?: boolean;
  staleTime?: number;
  /** Keep previous page/filter results visible while fetching the next set. */
  keepPrevious?: boolean;
  queryOptions?: Omit<
    UseQueryOptions<T, Error, T, QueryKey>,
    "queryKey" | "queryFn" | "enabled" | "staleTime"
  >;
};

export function useApiQuery<T>(
  queryKey: QueryKey,
  loader: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
): ApiQueryResult<T> {
  const {
    enabled = true,
    staleTime = STALE.operational,
    keepPrevious = false,
    queryOptions,
  } = options;

  const query = useQuery<T, Error>({
    queryKey,
    queryFn: loader,
    enabled,
    staleTime,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
    ...queryOptions,
  });

  const errorMessage =
    query.error instanceof ApiError
      ? query.error.message
      : query.error
        ? query.error.message || "Request failed"
        : null;

  return {
    data: query.data ?? null,
    // Only block UI when there is no usable cached/placeholder data.
    loading: query.isLoading && query.data === undefined,
    error: errorMessage,
    refetch: () => query.refetch(),
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
  };
}

export { STALE };
