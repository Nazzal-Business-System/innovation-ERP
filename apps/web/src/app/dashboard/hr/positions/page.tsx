"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CreatePositionDialog } from "@/components/hr/create-position-dialog";
import { HR_POSITION_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { positionColumns } from "@/components/hr/hr-columns";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { selectClassName } from "@/lib/form-utils";
import { useHrDepartments, useHrPositions } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { HR_PERMISSIONS, type HrPosition, type HrPositionSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

export default function PositionsListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [sort, setSort] = useState<HrPositionSort>("NEWEST");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: departments } = useHrDepartments();
  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    departmentId,
    activeFilter,
    sort,
  ]);
  const { data, loading, error, refetch } = useHrPositions({
    search: debouncedSearch || undefined,
    departmentId: departmentId || undefined,
    active: activeFilter === "" ? undefined : activeFilter === "true",
    sort,
    page,
  });

  function handleRowClick(row: HrPosition) {
    const href = `/dashboard/hr/positions/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <ModuleLayout><HrTableSkeleton /></ModuleLayout>;
  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title={t("hr.positionsTitle")} description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.positionsTitle")}
          description={t("hr.positionsDesc")}
          actions={
            canWrite ? (
              <Button type="button" className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.createPosition", "Create position")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}><HrNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title={t("hr.positionsTitle")}
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
                  aria-label={t("hr.filterDepartment", "Filter by department")}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allDepartments", "All departments")}</option>
                  {departments?.data.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("hr.filterActive", "Filter by active status")}
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="true">{t("status.activeOnly", "Active only")}</option>
                  <option value="false">{t("status.inactiveOnly", "Inactive only")}</option>
                  <option value="">{t("hr.allPositions", "All positions")}</option>
                </select>
                <HrListSortSelect
                  id="positions-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_POSITION_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable
            columns={positionColumns}
            data={data?.data ?? []}
            emptyTitle={t("hr.noPositions")}
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>

      {canWrite ? (
        <CreatePositionDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </ModuleLayout>
  );
}
