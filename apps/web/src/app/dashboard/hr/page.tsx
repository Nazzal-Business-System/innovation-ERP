"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Building2, CalendarClock, ClipboardList, FileWarning, FileText, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { leaveRequestColumns } from "@/components/hr/hr-columns";
import { HrPageSkeleton } from "@/components/hr/hr-page-skeleton";
import { LeaveStatusBadge } from "@/components/hr/hr-status-badge";
import { useHrOverview } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { HrLeaveRequest, LeaveStatus } from "@ierp/shared";

export default function HrOverviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useHrOverview();

  function handleLeaveClick(leave: HrLeaveRequest) {
    const href = `/dashboard/hr/leave-requests/${leave.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) {
    return (
      <ModuleLayout>
        <HrPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load HR" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const deptTotal = overview.employeesByDepartment.reduce((s, d) => s + d.count, 0);

  return (
    <div>
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("hr.title")}
          description={t("hr.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <HrNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard title="Total Employees" value={String(overview.totalEmployees)} change={`${overview.activeEmployees} active`} trend="neutral" icon={Users} />
          <KpiCard title={t("hr.payrollThisMonth")} value={overview.payrollThisMonth} change={`${overview.pendingPayrollRuns} draft runs`} trend="neutral" icon={Banknote} />
          <KpiCard title={t("hr.activeContracts")} value={String(overview.activeContracts)} change={`${overview.expiringContracts} ${t("hr.expiringSoon").toLowerCase()}`} trend={overview.expiringContracts > 0 ? "down" : "neutral"} icon={FileText} />
          <KpiCard title={t("hr.pendingLeave")} value={String(overview.pendingLeaveRequests)} change="Awaiting approval" trend={overview.pendingLeaveRequests > 0 ? "down" : "neutral"} icon={ClipboardList} />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.07}>
        <MetricGrid columns={4}>
          <KpiCard title="On Leave Today" value={String(overview.onLeaveToday)} change="Approved + status" trend="neutral" icon={CalendarClock} />
          <KpiCard title="Attendance Today" value={String(overview.attendanceToday)} change="Present/late/remote" trend="neutral" icon={UserCheck} />
          <KpiCard title={t("hr.missingDocuments")} value={String(overview.missingDocuments)} change="Upload required" trend={overview.missingDocuments > 0 ? "down" : "neutral"} icon={FileWarning} />
          <KpiCard title={t("hr.expiredDocuments")} value={String(overview.expiredDocuments)} change="Renewal needed" trend={overview.expiredDocuments > 0 ? "down" : "neutral"} icon={FileWarning} />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Employees by Department</CardTitle>
                <CardDescription>{overview.departmentsCount} departments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.employeesByDepartment.map((row) => (
                  <div key={row.code} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{row.department}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{row.code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${deptTotal ? (row.count / deptTotal) * 100 : 0}%` }} />
                      </div>
                      <span className="w-6 text-right text-sm font-semibold tabular-nums">{row.count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
                <CardDescription>Status breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.attendanceSummary.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No attendance records for today.</p>
                ) : (
                  overview.attendanceSummary.map((row) => (
                    <div key={row.status} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                      <span className="text-sm font-medium">{row.status.replace(/_/g, " ")}</span>
                      <span className="text-sm font-semibold tabular-nums">{row.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.12}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  New Hires
                </CardTitle>
                <CardDescription>Last 90 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.newHires.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No recent hires.</p>
                ) : (
                  overview.newHires.map((hire) => (
                    <Link key={hire.id} href={`/dashboard/hr/employees/${hire.id}`} className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{hire.fullName}</p>
                        <p className="font-mono text-xs text-[var(--muted)]">{hire.employeeNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--muted)]">{hire.department}</p>
                        <p className="text-sm tabular-nums">{hire.hireDate}</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.14}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-lg font-semibold">Recent Leave Requests</h2>
                <p className="text-sm text-[var(--muted)]">Latest submissions</p>
              </div>
              <Link href="/dashboard/hr/leave-requests" className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline">View all →</Link>
            </div>
            <DataTable
              columns={[
                ...leaveRequestColumns.slice(0, 4),
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ row }) => <LeaveStatusBadge status={row.original.status as LeaveStatus} />,
                },
              ]}
              data={overview.recentLeaveRequests}
              pageSize={6}
              onRowClick={handleLeaveClick}
              interactiveRows
            />
          </div>
        </FadeIn>
      </div>
    </ModuleLayout>
    </div>
  );
}
