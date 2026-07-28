"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SettingsAuditLog, SettingsUser } from "@ierp/shared";
import {
  extractAuditBusinessCode,
  formatAuditActionLabel,
  formatAuditDetailSummary,
  formatAuditEntityLabel,
  isUuidLike,
} from "@ierp/shared";
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
  const { t, locale } = useI18n();
  const auditLocale = locale === "ar" ? "ar" : "en";
  return [
    {
      id: "user",
      header: t("table.user"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.user?.name ?? t("common.system", "System")}</p>
          {row.original.user?.email && (
            <p className="text-xs text-[var(--muted)]">{row.original.user.email}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: t("table.action"),
      cell: ({ row }) => {
        const label = formatAuditActionLabel(row.original.action, auditLocale);
        const summary = formatAuditDetailSummary({
          action: row.original.action,
          entity: row.original.entity,
          entityId: row.original.entityId,
          details: row.original.details,
          userName: row.original.user?.name,
          locale: auditLocale,
        });
        const code = extractAuditBusinessCode(row.original.details);
        return (
          <div title={`${summary}\n${row.original.action}`}>
            <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
            {code ? (
              <p className="text-xs tabular-nums text-[var(--muted)]">{code}</p>
            ) : null}
            <p className="mt-0.5 hidden text-[10px] text-[var(--muted)] sm:block" aria-hidden>
              {row.original.action}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "entity",
      header: t("table.entity"),
      cell: ({ row }) => {
        const entityLabel = formatAuditEntityLabel(row.original.entity, auditLocale);
        const code = extractAuditBusinessCode(row.original.details);
        const showUuid =
          row.original.entityId && isUuidLike(row.original.entityId) && !code;
        return (
          <div title={row.original.entityId ?? undefined}>
            <p className="text-sm">{entityLabel}</p>
            {code ? (
              <p className="text-xs font-medium tabular-nums text-[var(--muted)]">{code}</p>
            ) : showUuid ? (
              <p className="font-mono text-[10px] text-[var(--muted)]">
                {t("settings.audit.technicalId", "Technical ID")}
              </p>
            ) : row.original.entityId && !isUuidLike(row.original.entityId) ? (
              <p className="text-xs tabular-nums text-[var(--muted)]">{row.original.entityId}</p>
            ) : null}
          </div>
        );
      },
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
  ];
}

export const PREFERENCE_LABELS: Record<string, string> = {
  defaultCurrency: "Default currency",
  language: "Language",
  timezone: "Timezone",
  fiscalYearStart: "Fiscal year start",
  dateFormat: "Date format",
};
