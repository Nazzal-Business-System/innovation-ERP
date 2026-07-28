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

const ENTITY_FILTERS = [
  "",
  "User",
  "PurchaseOrder",
  "SalesOrder",
  "JournalEntry",
  "LeaveRequest",
  "Report",
  "Organization",
  "Role",
  "Customer",
  "Vendor",
  "Product",
  "Employee",
  "KnowledgeArticle",
];

const ACTION_FILTERS = [
  "",
  "auth.login",
  "auth.logout",
  "procurement.purchase_order.approved",
  "sales.order.confirmed",
  "accounting.journal_entry.posted",
  "hr.leave.approved",
  "reports.generated",
];

const PAGE_SIZES = [10, 20, 50, 100] as const;

export default function AuditLogsPage() {
  const auditLogColumns = useAuditLogColumns();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    entity,
    action,
    from,
    to,
    pageSize,
  ]);
  const { data, loading, error, refetch } = useSettingsAuditLogs({
    search: debouncedSearch || undefined,
    entity: entity || undefined,
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize,
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
                  <div className="flex flex-wrap items-center gap-2">
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
                    <select
                      aria-label={t("settings.audit.filterAction", "Action")}
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className={cn(selectClassName, "min-w-[12rem]")}
                    >
                      {ACTION_FILTERS.map((value) => (
                        <option key={value || "all-actions"} value={value}>
                          {value || t("settings.audit.allActions", "All actions")}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      aria-label={t("settings.audit.from", "From")}
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className={cn(selectClassName, "min-w-[9rem]")}
                    />
                    <input
                      type="date"
                      aria-label={t("settings.audit.to", "To")}
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className={cn(selectClassName, "min-w-[9rem]")}
                    />
                    <select
                      aria-label={t("pagination.pageSize", "Rows per page")}
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className={cn(selectClassName, "min-w-[5rem]")}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
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
