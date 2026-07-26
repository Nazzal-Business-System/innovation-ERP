"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Notification } from "@ierp/shared";
import { notificationModuleLink, NOTIFICATIONS_PERMISSIONS } from "@ierp/shared";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsOverview,
} from "@/lib/hooks/use-notifications";
import {
  MODULE_ICONS,
  NotificationTypeBadge,
  TYPE_ICONS,
} from "@/components/notifications/notification-display";

function formatRelativeTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return locale === "ar" ? "الآن" : "Just now";
  if (minutes < 60) return locale === "ar" ? `منذ ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "ar" ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === "ar" ? `منذ ${days} ي` : `${days}d ago`;
}

function NotificationRow({
  item,
  onNavigate,
}: {
  item: Notification;
  onNavigate: (item: Notification) => void;
}) {
  const { locale, t } = useI18n();
  const TypeIcon = TYPE_ICONS[item.type];
  const ModuleIcon = MODULE_ICONS[item.module];
  const isUnread = !item.isRead;

  return (
    <DropdownMenuItem
      className={cn(
        "ierp-focus-ring flex cursor-pointer items-start gap-3 rounded-lg p-3",
        isUnread && "bg-[var(--accent-muted)]/40"
      )}
      onClick={() => onNavigate(item)}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)]",
          isUnread ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "bg-[var(--muted-bg)] text-[var(--muted-foreground)]"
        )}
      >
        <TypeIcon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("line-clamp-1 text-sm", isUnread ? "font-semibold" : "font-medium")}>
            {item.title}
          </span>
          {isUnread && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
          )}
        </span>
        <span className="line-clamp-2 text-xs text-[var(--muted-foreground)]">{item.message}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <NotificationTypeBadge type={item.type} label={t(`notifications.type.${item.type.toLowerCase()}`)} />
          <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <ModuleIcon className="h-3 w-3" aria-hidden />
            {t(`notifications.module.${item.module.toLowerCase()}`)}
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            · {formatRelativeTime(item.createdAt, locale)}
          </span>
        </span>
      </span>
    </DropdownMenuItem>
  );
}

export function NotificationsDropdown() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const permissions = useAuthStore((s) => s.permissions);
  const canRead = permissions.includes(NOTIFICATIONS_PERMISSIONS.READ);
  const { data, loading, refetch } = useNotificationsOverview();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!canRead) return null;

  const unreadCount = data?.unreadCount ?? 0;
  const recent = data?.recent ?? [];

  async function handleOpenChange(open: boolean) {
    if (open) void refetch();
  }

  async function handleNavigate(item: Notification) {
    if (!item.isRead) {
      try {
        await markRead.mutateAsync(item.id);
      } catch {
        /* ignore */
      }
    }
    const link = notificationModuleLink(item.module, item.entityType, item.entityId);
    if (link) router.push(link);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead.mutateAsync();
    } catch {
      /* ignore */
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 cursor-pointer"
          aria-label={unreadCount > 0 ? `${t("notifications.bellAria")} (${unreadCount})` : t("notifications.bellAria")}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">{t("notifications.title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer gap-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                void handleMarkAllRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {loading && !data ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">{t("common.loading")}</p>
        ) : recent.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">{t("notifications.empty")}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto p-1">
            {recent.map((item) => (
              <NotificationRow key={item.id} item={item} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button asChild variant="secondary" size="sm" className="w-full cursor-pointer">
            <Link href="/dashboard/notifications">{t("notifications.viewAll")}</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
