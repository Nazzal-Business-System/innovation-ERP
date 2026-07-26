"use client";

import { formatEntityTimestamp } from "@/lib/date";
import type { EntityAuditMeta } from "@/lib/entity-workspace/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EntityAudit({
  meta,
  className,
}: {
  meta: EntityAuditMeta;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const createdAt = formatEntityTimestamp(meta.createdAt, locale);
  const updatedAt = formatEntityTimestamp(meta.updatedAt, locale);
  const archivedAt = formatEntityTimestamp(meta.archivedAt, locale);
  const restoredAt = formatEntityTimestamp(meta.restoredAt, locale);
  const deactivatedAt = formatEntityTimestamp(meta.deactivatedAt, locale);
  const reactivatedAt = formatEntityTimestamp(meta.reactivatedAt, locale);
  const lastLoginAt = formatEntityTimestamp(meta.lastLoginAt, locale);

  const rows = [
    meta.id ? { label: t("entityWorkspace.recordId"), value: meta.id, mono: true } : null,
    createdAt
      ? {
          label: t("common.created"),
          value: `${createdAt}${meta.createdBy ? ` · ${meta.createdBy}` : ""}`,
        }
      : null,
    updatedAt
      ? {
          label: t("entityWorkspace.updated"),
          value: `${updatedAt}${meta.updatedBy ? ` · ${meta.updatedBy}` : ""}`,
        }
      : null,
    archivedAt
      ? {
          label: t("masterData.archivedAt"),
          value: `${archivedAt}${meta.lifecycleActor ? ` · ${meta.lifecycleActor}` : ""}`,
        }
      : null,
    restoredAt
      ? {
          label: t("masterData.restoredAt"),
          value: `${restoredAt}${meta.lifecycleActor ? ` · ${meta.lifecycleActor}` : ""}`,
        }
      : null,
    deactivatedAt
      ? {
          label: t("masterData.deactivatedAt"),
          value: `${deactivatedAt}${meta.lifecycleActor ? ` · ${meta.lifecycleActor}` : ""}`,
        }
      : null,
    reactivatedAt
      ? {
          label: t("masterData.reactivatedAt"),
          value: `${reactivatedAt}${meta.lifecycleActor ? ` · ${meta.lifecycleActor}` : ""}`,
        }
      : null,
    lastLoginAt ? { label: t("entityWorkspace.lastLogin"), value: lastLoginAt } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; mono?: boolean }>;

  if (!rows.length) return null;

  return (
    <footer
      className={cn("ew-audit", className)}
      aria-label={t("entityWorkspace.audit")}
    >
      <dl className="ew-audit-grid">
        {rows.map((row) => (
          <div key={row.label} className="ew-audit-item min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {row.label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 truncate text-xs text-[var(--foreground)]",
                row.mono && "ew-ltr-isolate font-mono"
              )}
              title={row.value}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </footer>
  );
}
