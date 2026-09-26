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
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmTableSkeleton } from "@/components/crm/crm-page-skeleton";
import { leadColumns, LEAD_SOURCE_LABELS } from "@/components/crm/crm-columns";
import { useCrmLeads } from "@/lib/hooks/use-crm";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { CRM_PERMISSIONS, type CrmLead } from "@ierp/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "LOST", label: "Lost" },
  { value: "CONVERTED", label: "Converted" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];


export default function LeadsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(CRM_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status, source]);

  const { data, loading, error, refetch } = useCrmLeads({
    search: debouncedSearch || undefined,
    status: status || undefined,
    source: source || undefined,
    page,
  });

  function handleRowClick(row: CrmLead) {
    const href = `/dashboard/crm/leads/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <CrmTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load leads" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("crm.leadsTitle")}
          description={t("crm.leadsDesc")}
          badge={data ? <Badge variant="secondary">{data.pagination.total} leads</Badge> : undefined}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/crm/leads/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("crm.newLead")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}><CrmNavLinks /></FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search leads, company, contact…"
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClassName} aria-label="Filter by status">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClassName} aria-label="Filter by source">
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={leadColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
