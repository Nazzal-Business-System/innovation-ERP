"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatAuditActionLabel, formatAuditEntityLabel, AUDIT_PERMISSIONS } from "@ierp/shared";
import { selectClassName, inputClassName } from "@/lib/form-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar, ToolbarField } from "@/components/data-display/table-toolbar";
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
] as const;

const ACTION_FILTERS = [
  "",
  "auth.login",
  "auth.logout",
  "procurement.purchase_order.approved",
  "sales.order.confirmed",
  "accounting.journal_entry.posted",
  "hr.leave.approved",
  "reports.generated",
] as const;

const PAGE_SIZES = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

export default function AuditLogsPage() {
  const auditLogColumns = useAuditLogColumns();
  const { t, locale } = useI18n();
  const auditLocale = locale === "ar" ? "ar" : "en";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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

  const filtersActive = useMemo(
    () =>
      Boolean(search.trim()) ||
      Boolean(entity) ||
      Boolean(action) ||
      Boolean(from) ||
      Boolean(to) ||
      pageSize !== DEFAULT_PAGE_SIZE,
    [search, entity, action, from, to, pageSize]
  );

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setEntity("");
    setAction("");
    setFrom("");
    setTo("");
    setPageSize(DEFAULT_PAGE_SIZE);
  }

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
                description={t(
                  "settings.audit.toolbarDesc",
                  "Filter by entity, action, or date. Newest activity first."
                )}
                searchPlaceholder={t("common.search", "Search…")}
                searchAriaLabel={t("settings.audit.search", "Search audit logs")}
                searchValue={search}
                onSearchChange={setSearch}
                filters={
                  <>
                    <ToolbarField
                      label={t("settings.audit.filterEntity", "Entity")}
                      htmlFor="audit-filter-entity"
                      className="w-full min-[480px]:w-auto sm:w-[10.5rem]"
                    >
                      <select
                        id="audit-filter-entity"
                        aria-label={t("settings.audit.filterEntity", "Entity")}
                        value={entity}
                        onChange={(e) => setEntity(e.target.value)}
                        className={cn(selectClassName, "w-full sm:w-[10.5rem]")}
                      >
                        {ENTITY_FILTERS.map((value) => (
                          <option key={value || "all"} value={value}>
                            {value
                              ? formatAuditEntityLabel(value, auditLocale)
                              : t("settings.audit.allEntities", "All entities")}
                          </option>
                        ))}
                      </select>
                    </ToolbarField>

                    <ToolbarField
                      label={t("settings.audit.filterAction", "Action")}
                      htmlFor="audit-filter-action"
                      className="w-full min-[480px]:w-auto sm:w-[12.5rem]"
                    >
                      <select
                        id="audit-filter-action"
                        aria-label={t("settings.audit.filterAction", "Action")}
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className={cn(selectClassName, "w-full sm:w-[12.5rem]")}
                      >
                        {ACTION_FILTERS.map((value) => (
                          <option key={value || "all-actions"} value={value}>
                            {value
                              ? formatAuditActionLabel(value, auditLocale)
                              : t("settings.audit.allActions", "All actions")}
                          </option>
                        ))}
                      </select>
                    </ToolbarField>

                    <div className="grid w-full grid-cols-2 gap-2 min-[480px]:flex min-[480px]:w-auto">
                      <ToolbarField
                        label={t("settings.audit.from", "From")}
                        htmlFor="audit-filter-from"
                      >
                        <input
                          id="audit-filter-from"
                          type="date"
                          aria-label={t("settings.audit.from", "From")}
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className={cn(inputClassName, "w-full min-[480px]:w-[10.5rem]")}
                        />
                      </ToolbarField>
                      <ToolbarField
                        label={t("settings.audit.to", "To")}
                        htmlFor="audit-filter-to"
                      >
                        <input
                          id="audit-filter-to"
                          type="date"
                          aria-label={t("settings.audit.to", "To")}
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className={cn(inputClassName, "w-full min-[480px]:w-[10.5rem]")}
                        />
                      </ToolbarField>
                    </div>

                    <ToolbarField
                      label={t("pagination.pageSize", "Rows per page")}
                      htmlFor="audit-filter-page-size"
                      className="w-[6.5rem] shrink-0"
                    >
                      <select
                        id="audit-filter-page-size"
                        aria-label={t("pagination.pageSize", "Rows per page")}
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className={cn(selectClassName, "w-[6.5rem]")}
                      >
                        {PAGE_SIZES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </ToolbarField>

                    {filtersActive ? (
                      <div className="flex items-end pb-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 gap-1.5 px-2.5"
                          onClick={clearFilters}
                          aria-label={t("common.clearFilters", "Clear filters")}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                          {t("common.clear", "Clear")}
                        </Button>
                      </div>
                    ) : null}
                  </>
                }
                endAddon={
                  <ToolbarPagination
                    pagination={data?.pagination}
                    onPageChange={onPageChange}
                    disabled={loading}
                  />
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
