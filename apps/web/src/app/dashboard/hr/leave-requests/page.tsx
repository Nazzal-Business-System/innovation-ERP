"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { HR_LEAVE_SORT_OPTIONS, HrListSortSelect } from "@/components/hr/hr-list-sort-select";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { leaveRequestColumns } from "@/components/hr/hr-columns";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/components/hr/hr-status-badge";
import { useHrLeaveRequests } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { HR_PERMISSIONS, type HrLeaveRequest, type HrLeaveSort } from "@ierp/shared";
import { cn } from "@/lib/utils";

const CreateLeaveRequestDialog = dynamic(
  () =>
    import("@/components/hr/create-leave-request-dialog").then((m) => ({
      default: m.CreateLeaveRequestDialog,
    })),
  { ssr: false }
);

export default function LeaveRequestsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<HrLeaveSort>("NEWEST");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status, type, sort]);

  const { data, loading, error, refetch } = useHrLeaveRequests({
    search: debouncedSearch || undefined,
    status: status || undefined,
    type: type || undefined,
    sort,
    page,
  });

  function handleRowClick(leave: HrLeaveRequest) {
    const href = `/dashboard/hr/leave-requests/${leave.id}`;
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
        <ErrorState
          title={t("hr.leaveRequestsTitle", "Leave Requests")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.leaveRequestsTitle", "Leave Requests")}
          description={t(
            "hr.leaveRequestsDesc",
            "Annual, sick, and emergency leave submissions with approval status."
          )}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("hr.requests", "requests")}
              </Badge>
            ) : undefined
          }
          actions={
            canWrite ? (
              <Button className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("hr.createLeaveRequest", "Create leave request")}
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
            title={t("hr.leaveRegister", "Leave register")}
            description={t("hr.leaveRegisterDesc", "Click any row to view request details.")}
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
                  aria-label="Filter by status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allStatuses", "All statuses")}</option>
                  {Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("hr.allTypes", "All types")}</option>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <HrListSortSelect
                  id="leave-requests-sort"
                  value={sort}
                  onChange={setSort}
                  options={HR_LEAVE_SORT_OPTIONS}
                />
              </div>
            }
          />
          <DataTable
            columns={[
              ...leaveRequestColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/hr/leave-requests/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("common.view", "View")}
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle={t("hr.noLeaveRequests", "No leave requests found")}
            emptyDescription={t("hr.tryAdjustFilters", "Try adjusting your search or filters.")}
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
      {createOpen ? (
        <CreateLeaveRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </ModuleLayout>
  );
}
