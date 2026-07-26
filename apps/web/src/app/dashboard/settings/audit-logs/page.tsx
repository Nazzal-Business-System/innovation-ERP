"use client";

import { useEffect, useState } from "react";
import { selectClassName } from "@/lib/form-utils";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks, SettingsPermissionGate } from "@/components/settings/settings-gate";
import { useAuditLogColumns } from "@/components/settings/settings-columns";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsAuditLogs } from "@/lib/hooks/use-settings";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { AUDIT_PERMISSIONS } from "@ierp/shared";
import { cn } from "@/lib/utils";


const ENTITY_FILTERS = ["", "User", "PurchaseOrder", "SalesOrder", "JournalEntry", "LeaveRequest", "Report", "Organization"];

export default function AuditLogsPage() {
  const auditLogColumns = useAuditLogColumns();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entity, setEntity] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, entity]);
  const { data, loading, error, refetch } = useSettingsAuditLogs({
    search: debouncedSearch || undefined,
    entity: entity || undefined,
    page,
  });

  if (loading && !data) {
    return (
      <ModuleLayout>
        <SettingsTableSkeleton />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("settings.audit.title")}
          description={t("settings.audit.description")}
          badge={data ? <Badge variant="secondary">{data.pagination.total}</Badge> : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <SettingsPermissionGate permission={AUDIT_PERMISSIONS.READ}>
          {error ? (
            <ErrorState title={t("error.loadAudit")} description={error} onRetry={() => void refetch()} />
          ) : (
            <div className="space-y-5">
              <TableToolbar
                title={t("settings.audit.activityLog")}
                description={t("settings.audit.filterEntity")}
                searchValue={search}
                onSearchChange={setSearch}
                endAddon={
                  <ToolbarPagination
                    pagination={data?.pagination}
                    onPageChange={onPageChange}
                    disabled={loading}
                  />
                }
                actions={
                  <select
                    aria-label={t("settings.audit.filterEntity")}
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                    className={cn(selectClassName, "min-w-[10rem]")}
                  >
                    {ENTITY_FILTERS.map((value) => (
                      <option key={value || "all"} value={value}>
                        {value || t("settings.audit.allEntities")}
                      </option>
                    ))}
                  </select>
                }
              />
              <DataTable
                columns={auditLogColumns}
                data={data?.data ?? []}
                emptyTitle={t("error.noAudit")}
                emptyDescription={t("common.filter")}
                serverPagination={serverPagination}
                paginationPosition="mobile-only"
              />
            </div>
          )}
        </SettingsPermissionGate>
      </FadeIn>
    </ModuleLayout>
  );
}
