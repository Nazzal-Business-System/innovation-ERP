"use client";

import { useCallback, useEffect, useState } from "react";

/** Shared page state for server-paginated lists. Resets to page 1 when filters change. */
export function useServerPagination(filterKey: string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>) {
  const [page, setPage] = useState(1);
  const key = Array.isArray(filterKey) ? filterKey.join("|") : String(filterKey ?? "");

  useEffect(() => {
    setPage(1);
  }, [key]);

  const onPageChange = useCallback((next: number) => {
    setPage(next);
  }, []);

  return { page, setPage, onPageChange };
}
