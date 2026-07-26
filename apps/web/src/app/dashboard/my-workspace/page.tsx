"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, BookOpen, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import {
  CheckInModeDialog,
  type SelfCheckInMode,
} from "@/components/hr/check-in-mode-dialog";
import {
  AttendanceStatusBadge,
  ContractStatusBadge,
  DocumentStatusBadge,
  EmploymentStatusBadge,
} from "@/components/hr/hr-status-badge";
import { SelfServiceAvatar } from "@/components/hr/self-service-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate, formatDisplayDateRange } from "@/lib/date";
import { formatEmployeeTenure } from "@/lib/hr/employee-profile";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  useSelfCheckIn,
  useSelfCheckOut,
  useSelfOverview,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

function OverviewSkeleton() {
  return (
    <ModuleLayout>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </ModuleLayout>
  );
}

export default function MyWorkspaceOverviewPage() {
  const { t, locale } = useI18n();
  const { data, loading, error, refetch } = useSelfOverview();
  const checkIn = useSelfCheckIn();
  const checkOut = useSelfCheckOut();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function handleCheckInConfirm(input: { mode: SelfCheckInMode; notes?: string }) {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await checkIn.mutateAsync(input);
      setActionSuccess(res.message || t("selfService.checkIn", "Check in"));
      setCheckInOpen(false);
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    }
  }

  async function handleCheckOut() {
    if (checkOut.isPending || checkIn.isPending) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await checkOut.mutateAsync();
      setActionSuccess(res.message || t("selfService.checkOut", "Check out"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    }
  }

  if (loading && !data) return <OverviewSkeleton />;

  if (error || !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error ?? t("selfService.noProfile", "No employee profile is linked.")}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const { profile } = data;
  const busy = checkIn.isPending || checkOut.isPending;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.overviewTitle", "My Overview")}
          description={t(
            "selfService.overviewDesc",
            "Your personal HR workspace — profile, attendance, leave, and payroll."
          )}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!data.canCheckIn || busy}
                onClick={() => {
                  setActionError(null);
                  setCheckInOpen(true);
                }}
              >
                {t("selfService.checkIn", "Check in")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!data.canCheckOut || busy}
                loading={checkOut.isPending}
                loadingText={t("selfService.checkingOut", "Checking out…")}
                onClick={() => void handleCheckOut()}
              >
                {t("selfService.checkOut", "Check out")}
              </Button>
            </div>
          }
        />
      </FadeIn>

      <ActionFeedback error={actionError} success={actionSuccess} />

      <CheckInModeDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        loading={checkIn.isPending}
        disabled={!data.canCheckIn}
        onConfirm={handleCheckInConfirm}
      />

      <FadeIn delay={0.04}>
        <section className="flex flex-col gap-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center">
          <SelfServiceAvatar
            fullName={profile.fullName}
            hasAvatar={profile.hasAvatar}
            avatarUpdatedAt={profile.avatarUpdatedAt}
            className="h-16 w-16 shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-[var(--foreground)]">
                {profile.fullName}
              </h2>
              <EmploymentStatusBadge status={profile.employmentStatus} />
            </div>
            <p className="text-sm text-[var(--muted)]">
              <span className="ew-ltr-isolate font-mono">{profile.employeeNumber}</span>
              {" · "}
              {profile.position.title}
              {" · "}
              {profile.department.name}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {t("selfService.tenure", "Tenure")}: {formatEmployeeTenure(profile.hireDate)}
              {profile.manager
                ? ` · ${t("selfService.manager", "Manager")}: ${profile.manager.fullName}`
                : null}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/my-workspace/profile">
              {t("selfService.profile", "My Profile")}
            </Link>
          </Button>
        </section>
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("selfService.todayAttendance", "Today")}{" "}
                <span className="ew-ltr-isolate font-normal text-[var(--muted)]">
                  ({formatDisplayDate(data.todayDate, locale)})
                </span>
              </h3>
              <Link
                href="/dashboard/my-workspace/attendance"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {t("selfService.attendance", "Attendance")}
              </Link>
            </div>
            {data.todayAttendance ? (
              <div className="mt-3 space-y-2 text-sm">
                <AttendanceStatusBadge status={data.todayAttendance.status} />
                <p className="text-[var(--muted)]">
                  {t("hr.checkIn", "Check in")}:{" "}
                  <span className="ew-ltr-isolate text-[var(--foreground)]">
                    {data.todayAttendance.checkIn ?? "—"}
                  </span>
                  {" · "}
                  {t("hr.checkOut", "Check out")}:{" "}
                  <span className="ew-ltr-isolate text-[var(--foreground)]">
                    {data.todayAttendance.checkOut ?? "—"}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("selfService.notCheckedIn", "Not checked in yet")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("selfService.pendingLeave", "Pending requests")}
              </h3>
              <Badge variant="secondary">{data.pendingLeaveCount}</Badge>
            </div>
            <Link
              href="/dashboard/my-workspace/leave"
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t("selfService.manageLeave", "Manage leave requests")}
            </Link>
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("selfService.latestPayroll", "Latest payroll")}
              </h3>
              <Link
                href="/dashboard/my-workspace/payroll"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {t("selfService.payroll", "Payroll")}
              </Link>
            </div>
            {data.latestPayroll ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-mono text-[var(--muted)]">{data.latestPayroll.runNumber}</p>
                <p className="ew-ltr-isolate text-[var(--muted)]">
                  {formatDisplayDateRange(
                    data.latestPayroll.periodStart,
                    data.latestPayroll.periodEnd,
                    locale
                  )}
                </p>
                <p className="font-medium">
                  {t("hr.netPay", "Net pay")}:{" "}
                  <span className="ew-ltr-isolate">{data.latestPayroll.netPay}</span>
                </p>
                <Badge
                  variant={data.latestPayroll.paymentStatus === "PAID" ? "success" : "secondary"}
                >
                  {data.latestPayroll.paymentStatus}
                </Badge>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("selfService.noPayroll", "No payroll slips yet.")}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("selfService.activeContract", "Active contract")}
              </h3>
              <Link
                href="/dashboard/my-workspace/contract"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {t("selfService.contract", "Contract")}
              </Link>
            </div>
            {data.activeContract ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{data.activeContract.contractNumber}</span>
                  <ContractStatusBadge status={data.activeContract.status} />
                </div>
                <p className="ew-ltr-isolate text-[var(--muted)]">
                  {formatDisplayDateRange(
                    data.activeContract.startDate,
                    data.activeContract.endDate,
                    locale
                  )}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("selfService.noContract", "No active contract on file.")}
              </p>
            )}
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileWarning className="h-4 w-4 text-[var(--warning)]" aria-hidden />
                {t("selfService.expiringDocs", "Expiring documents")}
              </h3>
              <Link
                href="/dashboard/my-workspace/documents"
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {t("selfService.documents", "Documents")}
              </Link>
            </div>
            {data.expiringDocuments.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {t("selfService.noExpiringDocs", "No documents expiring soon.")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.expiringDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{doc.title}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="ew-ltr-isolate text-[var(--muted)]">
                        {formatDisplayDate(doc.expiryDate, locale)}
                      </span>
                      <DocumentStatusBadge status={doc.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                {t("selfService.unreadNotifications", "Unread notifications")}
              </h3>
              <Badge variant={data.unreadNotifications > 0 ? "default" : "secondary"}>
                {data.unreadNotifications}
              </Badge>
            </div>
            <Link
              href="/dashboard/my-workspace/notifications"
              className="mt-3 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t("selfService.viewNotifications", "View notifications")}
            </Link>
          </section>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              {t("selfService.recentKnowledge", "Recent knowledge")}
            </h3>
            <Link
              href="/dashboard/my-workspace/knowledge"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              {t("nav.myKnowledge", "Knowledge")}
            </Link>
          </div>
          {data.recentKnowledge.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("selfService.noKnowledge", "No published articles yet.")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.recentKnowledge.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/dashboard/my-workspace/knowledge/${article.id}`}
                    className="block rounded-lg px-2 py-2 text-sm hover:bg-[var(--muted-bg)]/60"
                  >
                    <span className="font-medium text-[var(--foreground)]">{article.title}</span>
                    {article.category ? (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {article.category.name}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </FadeIn>
    </ModuleLayout>
  );
}
