"use client";

import { useState } from "react";
import { selectClassName } from "@/lib/form-utils";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { DatePicker } from "@/components/forms/date-picker";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { attendanceColumns } from "@/components/hr/hr-columns";
import { HrTableSkeleton } from "@/components/hr/hr-page-skeleton";
import { ATTENDANCE_STATUS_LABELS } from "@/components/hr/hr-status-badge";
import { useHrAttendance, useHrDepartments } from "@/lib/hooks/use-hr";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { todayApiDate } from "@/lib/date";
import { cn } from "@/lib/utils";


export default function AttendancePage() {
  const today = todayApiDate();
  const [date, setDate] = useState(today);
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");

  const { data: departments } = useHrDepartments();
  const { page, onPageChange } = useServerPagination([date, departmentId, status]);
  const { data, loading, error, refetch } = useHrAttendance({
    date: date || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page,
  });

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
        <ErrorState title="Unable to load attendance" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Attendance"
          description="Daily check-in records across Amman and Irbid locations."
          badge={data ? <Badge variant="secondary">{data.pagination.total} records</Badge> : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <HrNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Attendance register"
            description="Filter by date, department, or status."
            endAddon={
              <ToolbarPagination
                pagination={data?.pagination}
                onPageChange={onPageChange}
                disabled={loading}
              />
            }
            actions={
              <div className="flex flex-wrap gap-2">
                <DatePicker
                  id="attendance-date-filter"
                  value={date}
                  onChange={setDate}
                  withField={false}
                  optional
                  className="min-w-[9rem]"
                />
                <select aria-label="Filter by department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  <option value="">All departments</option>
                  {departments?.data.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={cn(selectClassName, "min-w-[9rem]")}>
                  <option value="">All statuses</option>
                  {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            }
          />
          <DataTable
            columns={attendanceColumns}
            data={data?.data ?? []}
            emptyTitle="No attendance records"
            emptyDescription="Try a different date or filter."
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
