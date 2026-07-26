"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import {
  CheckInModeDialog,
  type SelfCheckInMode,
} from "@/components/hr/check-in-mode-dialog";
import { AttendanceStatusBadge } from "@/components/hr/hr-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDisplayDate, todayApiDate } from "@/lib/date";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { mapSelfAttendanceTableRow } from "@/lib/hr/self-attendance-table";
import {
  useSelfAttendance,
  useSelfCheckIn,
  useSelfCheckOut,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

export default function MyAttendancePage() {
  const { t, locale } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, loading, error, refetch } = useSelfAttendance({
    from: from || undefined,
    to: to || undefined,
  });
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

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error && !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const rows = data?.data ?? [];
  const summary = data?.summary;
  const busy = checkIn.isPending || checkOut.isPending;
  const todayLabel = data?.todayDate ?? todayApiDate();

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.attendanceTitle", "My Attendance")}
          description={t(
            "selfService.attendanceDesc",
            "Your recent check-in and check-out history."
          )}
          badge={<Badge variant="secondary">{rows.length}</Badge>}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={!data?.canCheckIn || busy}
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
                disabled={!data?.canCheckOut || busy}
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

      <FadeIn delay={0.04}>
        <section className="rounded-2xl border border-[var(--border-subtle)] p-4">
          <h3 className="text-sm font-semibold">
            {t("selfService.todayAttendance", "Today")}{" "}
            <span className="ew-ltr-isolate font-normal text-[var(--muted)]">
              ({formatDisplayDate(todayLabel, locale)})
            </span>
          </h3>
          {data?.today ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <AttendanceStatusBadge status={data.today.status} />
              <span className="text-[var(--muted)]">
                {t("hr.checkIn", "Check in")}:{" "}
                <span className="ew-ltr-isolate text-[var(--foreground)]">
                  {data.today.checkIn ?? "—"}
                </span>
              </span>
              <span className="text-[var(--muted)]">
                {t("hr.checkOut", "Check out")}:{" "}
                <span className="ew-ltr-isolate text-[var(--foreground)]">
                  {data.today.checkOut ?? "—"}
                </span>
              </span>
              {data.today.notes ? (
                <span className="text-[var(--muted)]">
                  {t("hr.notes", "Notes")}:{" "}
                  <span className="text-[var(--foreground)]">{data.today.notes}</span>
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {t("selfService.notCheckedIn", "Not checked in yet")}
            </p>
          )}
        </section>
      </FadeIn>

      {summary ? (
        <FadeIn delay={0.05}>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["present", summary.present],
                ["remote", summary.remote],
                ["late", summary.late],
                ["absent", summary.absent],
                ["halfDay", summary.halfDay],
                ["total", summary.total],
              ] as const
            ).map(([key, count]) => (
              <div
                key={key}
                className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-center"
              >
                <p className="text-lg font-semibold tabular-nums">{count}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  {t(`hr.attendance.${key}`, key)}
                </p>
              </div>
            ))}
          </section>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.06}>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border-subtle)] p-4">
          <FormField htmlFor="att-from" label={t("selfService.filterFrom", "From")}>
            <DatePicker id="att-from" value={from} onChange={setFrom} />
          </FormField>
          <FormField htmlFor="att-to" label={t("selfService.filterTo", "To")}>
            <DatePicker id="att-to" value={to} onChange={setTo} />
          </FormField>
          {(from || to) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              {t("common.reset", "Reset")}
            </Button>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.date", "Date")}</TableHead>
                <TableHead>{t("hr.checkIn", "Check in")}</TableHead>
                <TableHead>{t("hr.checkOut", "Check out")}</TableHead>
                <TableHead>{t("hr.status", "Status")}</TableHead>
                <TableHead>{t("hr.notes", "Notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                    {t("selfService.noAttendance", "No attendance records yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const cells = mapSelfAttendanceTableRow(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="ew-ltr-isolate">
                        {formatDisplayDate(cells.date, locale)}
                      </TableCell>
                      <TableCell className="ew-ltr-isolate">{cells.checkIn}</TableCell>
                      <TableCell className="ew-ltr-isolate">{cells.checkOut}</TableCell>
                      <TableCell>
                        <AttendanceStatusBadge status={cells.status} />
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate">{cells.notes}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </FadeIn>

      <CheckInModeDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        loading={checkIn.isPending}
        disabled={!data?.canCheckIn}
        onConfirm={handleCheckInConfirm}
      />
    </ModuleLayout>
  );
}
