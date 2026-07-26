"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { HR_PAYROLL_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { payrollRunColumns } from "@/components/hr/hr-columns";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { selectClassName } from "@/lib/form-utils";
import { useCreatePayrollRun, useHrPayrollRuns } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { HR_PERMISSIONS, type HrPayrollRun, type HrPayrollSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

const PAYROLL_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PROCESSED", label: "Processed" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export default function PayrollListPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const createMutation = useCreatePayrollRun();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<HrPayrollSort>("NEWEST");
  const [feedback, setFeedback] = useState<{ success?: string; error?: string }>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status, sort]);
  const { data, loading, error, refetch } = useHrPayrollRuns({
    search: debouncedSearch || undefined,
    status: status || undefined,
    sort,
    page,
  });

  async function handleNewRun() {
    if (!canWrite || createMutation.isPending) return;
    setFeedback({});
    try {
      const now = new Date();
      const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const run = await createMutation.mutateAsync({ periodStart, periodEnd });
      const href = `/dashboard/hr/payroll/${run.id}`;
      startNavigation(href);
      router.push(href);
    } catch (err) {
      setFeedback({ error: mapTransactionUiError(err, t("form.submitFailed")) });
    }
  }

  function handleRowClick(row: HrPayrollRun) {
    const href = `/dashboard/hr/payroll/${row.id}`;
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
        <ErrorState title={t("hr.payrollTitle")} description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.payrollTitle")}
          description={t("hr.payrollDesc")}
          actions={
            canWrite ? (
              <Button
                className="cursor-pointer gap-2"
                loading={createMutation.isPending}
                onClick={() => void handleNewRun()}
                data-testid="new-payroll-run-btn"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.newPayrollRun")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <HrNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <ActionFeedback success={feedback.success} error={feedback.error} className="mb-4" />
        <div className="space-y-5">
          <TableToolbar
            title={t("hr.payrollRun")}
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
                  {PAYROLL_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(`hr.payrollStatus.${opt.value}`, opt.label)}
                    </option>
                  ))}
                </select>
                <HrListSortSelect
                  id="payroll-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_PAYROLL_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable
            columns={payrollRunColumns}
            data={data?.data ?? []}
            emptyTitle={t("hr.noPayrollRuns")}
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
