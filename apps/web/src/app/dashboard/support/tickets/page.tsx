"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SupportNavLinks } from "@/components/support/support-gate";
import {
  ticketColumnsForLocale,
  TICKET_PRIORITY_LABELS,
  TICKET_SOURCE_LABELS,
  TICKET_STATUS_LABELS,
} from "@/components/support/support-columns";
import { SupportTableSkeleton } from "@/components/support/support-page-skeleton";
import { useSupportCategories, useSupportTickets } from "@/lib/hooks/use-support";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SUPPORT_PERMISSIONS, type SupportTicket } from "@ierp/shared";


export default function TicketsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SUPPORT_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [source, setSource] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useSupportCategories({ activeOnly: true });
  const { page, onPageChange } = useServerPagination([debouncedSearch, status, priority, source, categoryId]);
  const { data, loading, error, refetch } = useSupportTickets({
    search: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    source: source || undefined,
    categoryId: categoryId || undefined,
    page,
  });

  function handleRowClick(row: SupportTicket) {
    const href = `/dashboard/support/tickets/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <SupportTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("support.ticketsLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusOptions = [
    { value: "", label: t("support.allStatuses") },
    ...Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const priorityOptions = [
    { value: "", label: t("support.allPriorities") },
    ...Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const sourceOptions = [
    { value: "", label: t("support.allSources") },
    ...Object.entries(TICKET_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const categoryOptions = [
    { value: "", label: t("support.allCategories") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("support.ticketsTitle")}
          description={t("support.ticketsDesc")}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("nav.tickets").toLowerCase()}
              </Badge>
            ) : undefined
          }
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/support/tickets/new"
                onClick={() => startNavigation("/dashboard/support/tickets/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("support.newTicket")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SupportNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("support.searchTickets")}
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClassName}
                aria-label="Filter by status"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value || "all-status"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={cn(selectClassName)}
                aria-label="Filter by priority"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value || "all-priority"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={selectClassName}
                aria-label="Filter by source"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value || "all-source"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={selectClassName}
                aria-label="Filter by category"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value || "all-category"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={ticketColumnsForLocale(locale)}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
