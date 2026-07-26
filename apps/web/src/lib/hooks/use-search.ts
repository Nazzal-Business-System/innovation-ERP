"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobalSearchResponse, GlobalSearchResult, SearchScopeFilter } from "@ierp/shared";
import {
  SEARCH_MODULE_LABELS,
  SEARCH_MODULE_ORDER,
  groupSearchResults,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { getNavLabel, useI18n } from "@/lib/i18n";
import { searchNavigation } from "@/lib/search/navigation-search";

export const MIN_SEARCH_LENGTH = 1;
const SEARCH_DEBOUNCE_MS = 200;
const RECORD_LIMIT = 32;
const NAV_LIMIT = 10;

const responseCache = new Map<string, { at: number; data: GlobalSearchResponse }>();
const CACHE_TTL_MS = 20_000;

function cacheKey(q: string, limit: number): string {
  return `${q.toLowerCase()}::${limit}`;
}

export function useGlobalSearch(query: string, enabled: boolean, scope: SearchScopeFilter) {
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { permissions } = usePermissions();
  const { t } = useI18n();

  const resolveLabel = useCallback(
    (itemId: string, groupId?: string) => {
      if (itemId === "settings") return t("nav.settings");
      if (itemId === "profile") return t("nav.profile", "Profile");
      return getNavLabel(t, itemId, groupId);
    },
    [t]
  );

  const navResults = useMemo(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < MIN_SEARCH_LENGTH) return [] as GlobalSearchResult[];
    if (scope === "records" || scope === "documents" || scope === "people") return [];
    return searchNavigation({
      query: trimmed,
      permissions,
      resolveLabel,
      limit: NAV_LIMIT,
    });
  }, [query, enabled, scope, permissions, resolveLabel]);

  const searchRecords = useCallback(async (q: string, signal: AbortSignal) => {
    const key = cacheKey(q, RECORD_LIMIT);
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
    const result = await apiFetch<GlobalSearchResponse>(
      `/search?q=${encodeURIComponent(q)}&limit=${RECORD_LIMIT}`,
      { signal }
    );
    responseCache.set(key, { at: Date.now(), data: result });
    return result;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      abortRef.current?.abort();
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (scope === "navigation") {
      abortRef.current?.abort();
      setLoading(false);
      setError(null);
      setData({
        query: trimmed,
        results: navResults,
        grouped: groupSearchResults(navResults, SEARCH_MODULE_LABELS, SEARCH_MODULE_ORDER),
      });
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);

      void searchRecords(trimmed, controller.signal)
        .then((recordResponse) => {
          if (controller.signal.aborted) return;
          let recordResults = recordResponse.results;
          if (scope === "documents") {
            recordResults = recordResults.filter(
              (r) => r.module === "DOCUMENTS" || r.module === "KNOWLEDGE"
            );
          } else if (scope === "people") {
            recordResults = recordResults.filter(
              (r) =>
                r.entityType === "employee" ||
                r.entityType === "customer" ||
                r.entityType === "vendor" ||
                r.entityType === "lead"
            );
          } else if (scope === "records") {
            recordResults = recordResults.filter((r) => r.kind !== "navigation");
          }

          const merged =
            scope === "all"
              ? [...navResults, ...recordResults]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, RECORD_LIMIT + NAV_LIMIT)
              : recordResults;

          // Prefer navigation group first in grouped view while keeping score order within groups
          const grouped = groupSearchResults(merged, SEARCH_MODULE_LABELS, SEARCH_MODULE_ORDER);
          setData({
            query: trimmed,
            results: merged,
            grouped,
            truncated: recordResponse.truncated,
          });
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Search failed");
          // Still show navigation matches on API failure
          setData({
            query: trimmed,
            results: scope === "all" ? navResults : [],
            grouped: groupSearchResults(
              scope === "all" ? navResults : [],
              SEARCH_MODULE_LABELS,
              SEARCH_MODULE_ORDER
            ),
          });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, enabled, scope, navResults, searchRecords]);

  return { data, loading, error, navResults };
}
