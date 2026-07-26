"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CreateDepartmentDialog } from "@/components/hr/create-department-dialog";
import { HR_DEPARTMENT_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { selectClassName } from "@/lib/form-utils";
import { useHrDepartments } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { HR_PERMISSIONS, type HrDepartmentSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

export default function DepartmentsPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [sort, setSort] = useState<HrDepartmentSort>("NEWEST");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, refetch } = useHrDepartments({
    search: debouncedSearch || undefined,
    active: activeFilter === "" ? undefined : activeFilter === "true",
    sort,
  });

  if (loading && !data) {
    return (
      <ModuleLayout>
        <HrTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("hr.departmentsTitle", "Departments")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.departmentsTitle", "Departments")}
          description={t(
            "hr.departmentsDesc",
            "Organizational structure and headcount by department."
          )}
          badge={
            <Badge variant="secondary">
              {data.data.length} {t("hr.departmentsTitle", "departments")}
            </Badge>
          }
          actions={
            canWrite ? (
              <Button className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.createDepartment", "Create department")}
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
            title={t("hr.departmentsTitle", "Departments")}
            searchValue={search}
            onSearchChange={setSearch}
            actions={
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label={t("hr.filterActive", "Filter by active status")}
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="true">{t("status.activeOnly", "Active only")}</option>
                  <option value="false">{t("status.inactiveOnly", "Inactive only")}</option>
                  <option value="">{t("hr.allDepartments", "All departments")}</option>
                </select>
                <HrListSortSelect
                  id="departments-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_DEPARTMENT_SORT_OPTIONS}
                />
              </div>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((dept) => (
              <PremiumCard key={dept.id} className="overflow-hidden">
                <Card className="border-0 bg-transparent shadow-none">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                        {dept.name}
                      </CardTitle>
                      <StatusBadge
                        status={dept.isActive ? "active" : "inactive"}
                        label={
                          dept.isActive
                            ? t("status.active", "Active")
                            : t("status.inactive", "Inactive")
                        }
                      />
                    </div>
                    <CardDescription className="font-mono">{dept.code}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dept.description && (
                      <p className="text-sm text-[var(--muted)]">{dept.description}</p>
                    )}
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                        <Users className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                        <div>
                          <p className="text-xs text-[var(--muted)]">
                            {t("hr.employeesTitle", "Employees")}
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {dept.employeeCount ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                        <Building2 className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                        <div>
                          <p className="text-xs text-[var(--muted)]">
                            {t("hr.positionsTitle", "Positions")}
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {dept.positionCount ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/hr/employees?department=${dept.id}`}
                      className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    >
                      {t("hr.viewEmployees", "View employees →")}
                    </Link>
                  </CardContent>
                </Card>
              </PremiumCard>
            ))}
          </div>
        </div>
      </FadeIn>

      <CreateDepartmentDialog open={createOpen} onOpenChange={setCreateOpen} />
    </ModuleLayout>
  );
}
