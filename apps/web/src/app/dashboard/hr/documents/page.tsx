"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CreateHrDocumentDialog } from "@/components/hr/create-hr-document-dialog";
import { HR_DOCUMENT_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { documentColumns } from "@/components/hr/hr-columns";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { selectClassName } from "@/lib/form-utils";
import { useHrDocuments } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import {
  HR_PERMISSIONS,
  type HrDocument,
  type HrDocumentExpiryState,
  type HrDocumentSort,
} from "@ierp/shared";
import { cn } from "@/lib/utils";

const DOCUMENT_STATUSES = [
  { value: "VALID", label: "Valid" },
  { value: "EXPIRED", label: "Expired" },
  { value: "MISSING", label: "Missing" },
  { value: "PENDING_REVIEW", label: "Pending review" },
] as const;

const DOCUMENT_TYPES = [
  "Passport",
  "Work Permit",
  "ID Card",
  "Certificate",
  "Contract Copy",
  "Other",
] as const;

const EXPIRY_STATES: Array<{ value: "" | HrDocumentExpiryState; label: string }> = [
  { value: "", label: "All expiry states" },
  { value: "expired", label: "Expired" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "ok", label: "OK" },
];

export default function DocumentsListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [expiryState, setExpiryState] = useState<"" | HrDocumentExpiryState>("");
  const [sort, setSort] = useState<HrDocumentSort>("NEWEST");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    status,
    documentType,
    expiryState,
    sort,
  ]);
  const { data, loading, error, refetch } = useHrDocuments({
    search: debouncedSearch || undefined,
    status: status || undefined,
    documentType: documentType || undefined,
    expiryState: expiryState || undefined,
    sort,
    page,
  });

  function handleRowClick(row: HrDocument) {
    const href = `/dashboard/hr/documents/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <ModuleLayout><HrTableSkeleton /></ModuleLayout>;
  if (error) return <ModuleLayout maxWidth="lg"><ErrorState title={t("hr.documentsTitle")} description={error} onRetry={() => void refetch()} /></ModuleLayout>;

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.documentsTitle")}
          description={t("hr.documentsDesc")}
          actions={
            canWrite ? (
              <Button className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.createDocument", "Create employee document")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}><HrNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title={t("hr.documentsTitle")}
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
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label={t("hr.filterStatus", "Filter by status")}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allStatuses", "All statuses")}</option>
                  {DOCUMENT_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`hr.documentStatus.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("hr.filterDocumentType", "Filter by document type")}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allTypes", "All types")}</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("hr.filterExpiryState", "Filter by expiry state")}
                  value={expiryState}
                  onChange={(e) => setExpiryState(e.target.value as "" | HrDocumentExpiryState)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  {EXPIRY_STATES.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {t(`hr.expiryState.${opt.value || "all"}`, opt.label)}
                    </option>
                  ))}
                </select>
                <HrListSortSelect
                  id="documents-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_DOCUMENT_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable columns={documentColumns} data={data?.data ?? []} emptyTitle={t("hr.noDocuments")} onRowClick={handleRowClick} interactiveRows serverPagination={serverPagination} paginationPosition="mobile-only" />
        </div>
      </FadeIn>
      <CreateHrDocumentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </ModuleLayout>
  );
}
