"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CreateContractDialog } from "@/components/hr/create-contract-dialog";
import { HR_CONTRACT_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { contractColumns } from "@/components/hr/hr-columns";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { selectClassName } from "@/lib/form-utils";
import { useHrContracts } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { HR_PERMISSIONS, type HrContract, type HrContractSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

const CONTRACT_TYPES = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONSULTANT", label: "Consultant" },
] as const;

const CONTRACT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "DRAFT", label: "Draft" },
] as const;

export default function ContractsListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [contractType, setContractType] = useState("");
  const [sort, setSort] = useState<HrContractSort>("NEWEST");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    status,
    contractType,
    sort,
  ]);
  const { data, loading, error, refetch } = useHrContracts({
    search: debouncedSearch || undefined,
    status: status || undefined,
    contractType: contractType || undefined,
    sort,
    page,
  });

  function handleRowClick(row: HrContract) {
    const href = `/dashboard/hr/contracts/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <ModuleLayout><HrTableSkeleton /></ModuleLayout>;
  if (error) return <ModuleLayout maxWidth="lg"><ErrorState title={t("hr.contractsTitle")} description={error} onRetry={() => void refetch()} /></ModuleLayout>;

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.contractsTitle")}
          description={t("hr.contractsDesc")}
          actions={
            canWrite ? (
              <Button className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.createContract", "Create contract")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}><HrNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title={t("hr.contractsTitle")}
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
                  {CONTRACT_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`hr.contractStatus.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("hr.filterContractType", "Filter by contract type")}
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allTypes", "All types")}</option>
                  {CONTRACT_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`hr.contractType.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
                <HrListSortSelect
                  id="contracts-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_CONTRACT_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable columns={contractColumns} data={data?.data ?? []} emptyTitle={t("hr.noContracts")} onRowClick={handleRowClick} interactiveRows serverPagination={serverPagination} paginationPosition="mobile-only" />
        </div>
      </FadeIn>
      <CreateContractDialog open={createOpen} onOpenChange={setCreateOpen} />
    </ModuleLayout>
  );
}
