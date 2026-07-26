"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Notification, NotificationModule, NotificationType } from "@ierp/shared";
import { notificationModuleLink } from "@ierp/shared";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TablePagination } from "@/components/data-display/table-pagination";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import {
  MODULE_ICONS,
  NotificationTypeBadge,
  TYPE_ICONS,
} from "@/components/notifications/notification-display";
import { NotificationsPageSkeleton } from "@/components/notifications/notifications-page-skeleton";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useNotificationsOverview,
} from "@/lib/hooks/use-notifications";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";

const MODULE_FILTERS: Array<{ value: NotificationModule | "ALL"; labelKey: string }> = [
  { value: "ALL", labelKey: "common.all" },
  { value: "INVENTORY", labelKey: "notifications.module.inventory" },
  { value: "PROCUREMENT", labelKey: "notifications.module.procurement" },
  { value: "SALES", labelKey: "notifications.module.sales" },
  { value: "ACCOUNTING", labelKey: "notifications.module.accounting" },
  { value: "HR", labelKey: "notifications.module.hr" },
  { value: "PROJECTS", labelKey: "notifications.module.projects" },
  { value: "SUPPORT", labelKey: "notifications.module.support" },
  { value: "DOCUMENTS", labelKey: "notifications.module.documents" },
  { value: "KNOWLEDGE", labelKey: "notifications.module.knowledge" },
  { value: "REPORTS", labelKey: "notifications.module.reports" },
  { value: "SYSTEM", labelKey: "notifications.module.system" },
];

const TYPE_FILTERS: Array<{ value: NotificationType | "ALL"; labelKey: string }> = [
  { value: "ALL", labelKey: "notifications.allTypes" },
  { value: "INFO", labelKey: "notifications.type.info" },
  { value: "SUCCESS", labelKey: "notifications.type.success" },
  { value: "WARNING", labelKey: "notifications.type.warning" },
  { value: "ERROR", labelKey: "notifications.type.error" },
];

function formatDateTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-JO" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NotificationsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [moduleFilter, setModuleFilter] = useState<NotificationModule | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { page, onPageChange } = useServerPagination([unreadOnly, typeFilter, moduleFilter]);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const { data: overview } = useNotificationsOverview();
  const { data, loading, error, refetch } = useNotificationsList({
    page,
    unreadOnly,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    module: moduleFilter === "ALL" ? undefined : moduleFilter,
  });

  async function handleItemClick(item: Notification) {
    if (!item.isRead) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        /* ignore */
      }
    }
    const link = notificationModuleLink(item.module, item.entityType, item.entityId);
    if (link) {
      startNavigation(link);
      router.push(link);
    }
  }

  async function handleMarkAllRead() {
    await markAllRead.mutateAsync();
  }

  const items = data?.data ?? [];
  const pagination = data?.pagination;
  const serverPagination = toServerPagination(pagination, onPageChange, loading);
  const unreadCount = overview?.unreadCount ?? 0;

  if (loading && !data) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader
          title={t("notifications.title")}
          description={t("notifications.description")}
          badge={
            unreadCount > 0 ? (
              <Badge variant="default">
                {unreadCount} {t("notifications.unreadBadge")}
              </Badge>
            ) : (
              <Badge variant="outline">{t("common.liveData")}</Badge>
            )
          }
          actions={
            unreadCount > 0 ? (
              <Button variant="secondary" size="sm" className="cursor-pointer gap-2" onClick={() => void handleMarkAllRead()}>
                <CheckCheck className="h-4 w-4" />
                {t("notifications.markAllRead")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={unreadOnly ? "default" : "outline"}
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => setUnreadOnly((v) => !v)}
              >
                <Filter className="h-3.5 w-3.5" />
                {t("notifications.unreadOnly")}
              </Button>
              {MODULE_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant={moduleFilter === f.value ? "default" : "outline"}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setModuleFilter(f.value)}
                >
                  {t(f.labelKey)}
                </Button>
              ))}
            </div>
            <ToolbarPagination
              pagination={pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "secondary" : "ghost"}
                size="sm"
                className="cursor-pointer"
                onClick={() => setTypeFilter(f.value)}
              >
                {t(f.labelKey)}
              </Button>
            ))}
          </div>
        </div>
      </FadeIn>

      {error ? (
        <ErrorState title={t("notifications.loadError")} description={error} onRetry={() => void refetch()} />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="h-10 w-10 text-[var(--muted-foreground)]" />
            <p className="text-sm text-[var(--muted-foreground)]">{t("notifications.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <FadeIn delay={0.06}>
          <div className="space-y-2">
            {items.map((item) => {
              const TypeIcon = TYPE_ICONS[item.type];
              const ModuleIcon = MODULE_ICONS[item.module];
              const isUnread = !item.isRead;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleItemClick(item)}
                  className={cn(
                    "ierp-focus-ring flex w-full cursor-pointer items-start gap-4 rounded-xl border border-[var(--border-subtle)] p-4 text-start transition-colors hover:bg-[var(--muted-bg)]/50",
                    isUnread && "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)]/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)]",
                      isUnread ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "bg-[var(--muted-bg)]"
                    )}
                  >
                    <TypeIcon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", isUnread ? "font-semibold" : "font-medium")}>{item.title}</span>
                      <NotificationTypeBadge type={item.type} label={t(`notifications.type.${item.type.toLowerCase()}`)} />
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <ModuleIcon className="h-3 w-3" aria-hidden />
                        {t(`notifications.module.${item.module.toLowerCase()}`)}
                      </Badge>
                      {isUnread && <Badge variant="default">{t("notifications.unread")}</Badge>}
                    </span>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.message}</p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">{formatDateTime(item.createdAt, locale)}</p>
                  </span>
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      {serverPagination && (
        <div className="flex justify-center pt-2 sm:hidden">
          <TablePagination
            page={serverPagination.page}
            totalPages={serverPagination.totalPages}
            totalItems={serverPagination.totalItems}
            pageSize={serverPagination.pageSize}
            onPageChange={onPageChange}
            disabled={loading}
            variant="footer"
          />
        </div>
      )}
    </ModuleLayout>
  );
}
