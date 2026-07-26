"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  Notification,
  NotificationsListResponse,
  NotificationsOverview,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query/client";
import {
  isPaginated,
  matchesQueryPrefix,
  reconcileQueries,
} from "@/lib/query/optimistic";

export function useNotificationsOverview() {
  return useAsyncData(
    queryKeys.notifications.overview,
    () => apiFetch<NotificationsOverview>("/notifications/overview"),
    { staleTime: STALE.dashboard }
  );
}

export function useNotificationsList(params: {
  page?: number;
  unreadOnly?: boolean;
  type?: string;
  module?: string;
} = {}) {
  const { page, unreadOnly, type, module } = params;
  return useAsyncData([...queryKeys.notifications.list, page, unreadOnly, type, module], () => {
    const query = new URLSearchParams();
    if (page) query.set("page", String(page));
    if (unreadOnly) query.set("unreadOnly", "true");
    if (type) query.set("type", type);
    if (module) query.set("module", module);
    const qs = query.toString();
    return apiFetch<NotificationsListResponse>(`/notifications${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const res = await apiFetch<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
  return res.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await apiFetch<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
  });
  return res.updated;
}

function patchNotificationLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (item: Notification) => Notification,
  options?: { removeIf?: (item: Notification, queryKey: readonly unknown[]) => boolean }
) {
  const queries = queryClient.getQueryCache().findAll({
    predicate: (q) => matchesQueryPrefix(q.queryKey, queryKeys.notifications.list),
  });
  for (const query of queries) {
    const old = query.state.data;
    if (!isPaginated<Notification>(old)) continue;
    let changed = false;
    const nextData: Notification[] = [];
    for (const item of old.data) {
      const updated = updater(item);
      if (updated !== item) changed = true;
      if (options?.removeIf?.(updated, query.queryKey)) {
        changed = true;
        continue;
      }
      nextData.push(updated);
    }
    if (!changed) continue;
    queryClient.setQueryData(query.queryKey, {
      ...old,
      data: nextData,
      pagination: {
        ...old.pagination,
        total: nextData.length === old.data.length
          ? old.pagination.total
          : Math.max(0, old.pagination.total - (old.data.length - nextData.length)),
      },
    });
  }
}

/** Optimistic mark-one-read used by dropdown + list pages. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async (id: string) => {
      let unreadDelta = 0;
      const snapshots = queryClient
        .getQueryCache()
        .findAll({
          predicate: (q) =>
            matchesQueryPrefix(q.queryKey, queryKeys.notifications.list) ||
            matchesQueryPrefix(q.queryKey, queryKeys.notifications.overview),
        })
        .map((q) => ({ queryKey: q.queryKey, data: q.state.data }));

      patchNotificationLists(
        queryClient,
        (item) => {
          if (item.id !== id || item.isRead) return item;
          unreadDelta -= 1;
          return { ...item, isRead: true };
        },
        {
          removeIf: (item, queryKey) => {
            const unreadOnly = queryKey[2] === true;
            return unreadOnly && item.isRead;
          },
        }
      );
      queryClient.setQueryData<NotificationsOverview>(queryKeys.notifications.overview, (old) => {
        if (!old) return old;
        return {
          ...old,
          unreadCount: Math.max(0, old.unreadCount + unreadDelta),
          recent: old.recent.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        };
      });

      try {
        const notification = await markNotificationRead(id);
        patchNotificationLists(
          queryClient,
          (item) => (item.id === id ? notification : item),
          {
            removeIf: (item, queryKey) => {
              const unreadOnly = queryKey[2] === true;
              return unreadOnly && item.isRead;
            },
          }
        );
        reconcileQueries(queryClient, [
          queryKeys.notifications.list,
          queryKeys.notifications.overview,
        ]);
        return notification;
      } catch (err) {
        for (const snap of snapshots) {
          queryClient.setQueryData(snap.queryKey, snap.data);
        }
        throw err;
      }
    },
  };
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async () => {
      const snapshots = queryClient
        .getQueryCache()
        .findAll({
          predicate: (q) =>
            matchesQueryPrefix(q.queryKey, queryKeys.notifications.list) ||
            matchesQueryPrefix(q.queryKey, queryKeys.notifications.overview),
        })
        .map((q) => ({ queryKey: q.queryKey, data: q.state.data }));

      patchNotificationLists(queryClient, (item) =>
        item.isRead ? item : { ...item, isRead: true }
      );
      queryClient.setQueryData<NotificationsOverview>(queryKeys.notifications.overview, (old) =>
        old
          ? {
              ...old,
              unreadCount: 0,
              recent: old.recent.map((n) => ({ ...n, isRead: true })),
            }
          : old
      );

      // Drop unread-only lists to empty immediately
      const unreadLists = queryClient.getQueryCache().findAll({
        predicate: (q) =>
          matchesQueryPrefix(q.queryKey, queryKeys.notifications.list) && q.queryKey[2] === true,
      });
      for (const q of unreadLists) {
        const old = q.state.data;
        if (isPaginated<Notification>(old)) {
          queryClient.setQueryData(q.queryKey, {
            ...old,
            data: [],
            pagination: { ...old.pagination, total: 0, totalPages: 0 },
          });
        }
      }

      try {
        const updated = await markAllNotificationsRead();
        reconcileQueries(queryClient, [
          queryKeys.notifications.list,
          queryKeys.notifications.overview,
        ]);
        return updated;
      } catch (err) {
        for (const snap of snapshots) {
          queryClient.setQueryData(snap.queryKey, snap.data);
        }
        throw err;
      }
    },
  };
}
