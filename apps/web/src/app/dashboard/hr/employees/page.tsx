"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { CreateEmployeeDialog } from "@/components/hr/create-employee-dialog";
import { HR_EMPLOYEE_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { employeeColumns, EMPLOYMENT_STATUS_LABELS } from "@/components/hr/hr-columns";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { useHrDepartments, useHrEmployees } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { HR_PERMISSIONS, type HrEmployee, type HrEmployeeSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

const LOCATIONS = ["", "Amman HQ", "Amman Warehouse", "Irbid Branch", "Irbid Warehouse"];


export default function EmployeesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentId, setDepartmentId] = useState(() => searchParams.get("department") ?? "");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [sort, setSort] = useState<HrEmployeeSort>("NAME_ASC");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const dept = searchParams.get("department");
    if (dept) setDepartmentId(dept);
  }, [searchParams]);

  const { data: departments } = useHrDepartments();
  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    departmentId,
    status,
    location,
    activeFilter,
    sort,
  ]);
  const { data, loading, error, refetch } = useHrEmployees({
    search: debouncedSearch || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    location: location || undefined,
    active: activeFilter === "" ? undefined : activeFilter === "true",
    sort,
    page,
  });

  function handleRowClick(emp: HrEmployee) {
    const href = `/dashboard/hr/employees/${emp.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <HrTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load employees" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Employees"
          description="Workforce directory — departments, positions, and employment status."
          badge={data ? <Badge variant="secondary">{data.pagination.total} employees</Badge> : undefined}
          actions={
            canWrite ? (
              <Button
                type="button"
                className="cursor-pointer gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("masterData.createEmployee", "Create employee")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <HrNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Employee register"
            description="Click any row to view employee profile."
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
                <select aria-label="Filter by department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  <option value="">All departments</option>
                  {departments?.data.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  <option value="">All statuses</option>
                  {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select aria-label="Filter by location" value={location} onChange={(e) => setLocation(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  {LOCATIONS.map((loc) => (
                    <option key={loc || "all"} value={loc}>{loc || "All locations"}</option>
                  ))}
                </select>
                <select aria-label="Filter by lifecycle status" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  <option value="true">Active only</option>
                  <option value="false">Inactive only</option>
                  <option value="">All employees</option>
                </select>
                <HrListSortSelect
                  id="employees-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_EMPLOYEE_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable
            columns={[
              ...employeeColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link href={`/dashboard/hr/employees/${row.original.id}`} className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline" onClick={(e) => e.stopPropagation()}>View</Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No employees found"
            emptyDescription="Try adjusting your search or filters."
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>

      {canWrite ? <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
    </ModuleLayout>
  );
}
