"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SettingsAuditLog, SettingsUser } from "@ierp/shared";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { PersonAvatar, PersonAvatarLabel } from "@/components/avatar/person-avatar";
import { StatusBadge } from "@/components/data-display/status-badge";
import { useI18n } from "@/lib/i18n";

export function useUserColumns(): ColumnDef<SettingsUser>[] {
  const { t } = useI18n();
  return [
    {
      accessorKey: "name",
      header: t("table.name"),
      cell: ({ row }) => (
        <PersonAvatarLabel
          name={row.original.name}
          avatar={
            <PersonAvatar
              name={row.original.name}
              source={{
                kind: "user",
                userId: row.original.id,
                hasAvatar: row.original.hasAvatar,
                avatarUpdatedAt: row.original.avatarUpdatedAt,
              }}
              size="sm"
              presence={{
                lastSeenAt: row.original.lastSeenAt,
                lastActiveAt: row.original.lastActiveAt,
              }}
              lazy
            />
          }
        />
      ),
    },
    {
      accessorKey: "email",
      header: t("table.email"),
      cell: ({ row }) => <span className="text-sm text-[var(--muted)]">{row.original.email}</span>,
    },
    {
      id: "roles",
      header: t("table.roles"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((role) => (
            <span key={role.id} className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 text-xs">
              {role.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "organization",
      header: t("table.organization"),
      cell: ({ row }) => <span className="text-sm">{row.original.organization.name}</span>,
    },
    {
      id: "presence",
      header: t("presence.status", "Presence"),
      cell: ({ row }) => (
        <PresenceBadge
          lastSeenAt={row.original.lastSeenAt}
          lastActiveAt={row.original.lastActiveAt}
          showLabel
        />
      ),
    },
    {
      accessorKey: "isActive",
      header: t("common.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? "active" : "inactive"}
          label={row.original.isActive ? t("common.active") : t("common.inactive")}
        />
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("common.created"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];
}

export function useAuditLogColumns(): ColumnDef<SettingsAuditLog>[] {
  const { t } = useI18n();
  return [
    {
      id: "user",
      header: t("table.user"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.user?.name ?? "System"}</p>
          {row.original.user?.email && (
            <p className="text-xs text-[var(--muted)]">{row.original.user.email}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: t("table.action"),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.action}</span>,
    },
    {
      accessorKey: "entity",
      header: t("table.entity"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.entity}</p>
          {row.original.entityId && (
            <p className="font-mono text-xs text-[var(--muted)]">{row.original.entityId.slice(0, 8)}…</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("table.timestamp"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "ip",
      header: t("table.ip"),
      cell: () => <span className="text-xs text-[var(--muted)]">—</span>,
    },
  ];
}

export const PREFERENCE_LABELS: Record<string, string> = {
  defaultCurrency: "Default currency",
  language: "Language",
  timezone: "Timezone",
  fiscalYearStart: "Fiscal year start",
  dateFormat: "Date format",
};
