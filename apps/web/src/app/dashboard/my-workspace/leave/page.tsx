"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HR_SELF_PERMISSIONS, inclusiveCalendarDays, type LeaveType } from "@ierp/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { LeaveStatusBadge, LEAVE_TYPE_LABELS } from "@/components/hr/hr-status-badge";
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
import { inputClassName } from "@/lib/form-utils";
import {
  useCancelSelfLeaveRequest,
  useCreateSelfLeaveRequest,
  useSelfLeaveRequests,
  useSelfProfile,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/auth-store";

const LEAVE_TYPES: LeaveType[] = ["ANNUAL", "SICK", "UNPAID", "EMERGENCY"];

export default function MyLeavePage() {
  const { t, locale } = useI18n();
  const permissions = useAuthStore((s) => s.permissions);
  const canWrite = permissions.includes(HR_SELF_PERMISSIONS.WRITE);
  const { data: profile } = useSelfProfile();
  const { data, loading, error, refetch } = useSelfLeaveRequests();
  const createMutation = useCreateSelfLeaveRequest();
  const cancelMutation = useCancelSelfLeaveRequest();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState(todayApiDate());
  const [endDate, setEndDate] = useState(todayApiDate());
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [listSuccess, setListSuccess] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    return inclusiveCalendarDays(startDate, endDate);
  }, [startDate, endDate]);

  const leaveTypeOptions = useMemo(
    () =>
      LEAVE_TYPES.map((value) => ({
        value,
        label: t(`hr.leaveType.${value}`, LEAVE_TYPE_LABELS[value] ?? value),
      })),
    [t]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || createMutation.isPending) return;

    const errors: Record<string, string> = {};
    if (!startDate) errors.startDate = t("form.required", "Required");
    if (!endDate) errors.endDate = t("form.required", "Required");
    if (startDate && endDate && endDate < startDate) {
      errors.endDate = t("hr.dateOrderInvalid", "End date must be on or after start date.");
    }
    if (calculatedDays < 1) {
      errors.endDate = t("hr.daysInvalid", "Enter a valid date range.");
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    try {
      await createMutation.mutateAsync({
        type,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        ...(profile?.manager?.id ? { assignedApproverId: profile.manager.id } : {}),
      });
      setOpen(false);
      setReason("");
      setType("ANNUAL");
      const today = todayApiDate();
      setStartDate(today);
      setEndDate(today);
      setListSuccess(t("selfService.requestLeave", "Request leave"));
    } catch (err) {
      setFormError(mapTransactionUiError(err, t("form.submitFailed")));
    }
  }

  async function handleCancel(id: string) {
    if (!canWrite || cancelMutation.isPending) return;
    setListError(null);
    setListSuccess(null);
    setCancellingId(id);
    try {
      await cancelMutation.mutateAsync(id);
      setListSuccess(t("selfService.leaveCancelled", "Leave request cancelled"));
    } catch (err) {
      setListError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
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

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.leaveTitle", "My Leave Requests")}
          description={t(
            "selfService.leaveDesc",
            "View and submit leave requests for yourself only."
          )}
          badge={<Badge variant="secondary">{rows.length}</Badge>}
          actions={
            canWrite ? (
              <Button type="button" onClick={() => setOpen(true)}>
                {t("selfService.requestLeave", "Request leave")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <ActionFeedback error={listError} success={listSuccess} />

      <FadeIn delay={0.04}>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.leaveType", "Type")}</TableHead>
                <TableHead>{t("hr.startDate", "Start")}</TableHead>
                <TableHead>{t("hr.endDate", "End")}</TableHead>
                <TableHead>{t("hr.days", "Days")}</TableHead>
                <TableHead>{t("hr.status", "Status")}</TableHead>
                <TableHead>{t("hr.reason", "Reason")}</TableHead>
                <TableHead className="w-[1%]">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-[var(--muted)]">
                    {t("selfService.noLeave", "No leave requests yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/my-workspace/leave/${row.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {t(`hr.leaveType.${row.type}`, LEAVE_TYPE_LABELS[row.type] ?? row.type)}
                      </Link>
                    </TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {formatDisplayDate(row.startDate, locale)}
                    </TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {formatDisplayDate(row.endDate, locale)}
                    </TableCell>
                    <TableCell>{row.days}</TableCell>
                    <TableCell>
                      <LeaveStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">{row.reason ?? "—"}</TableCell>
                    <TableCell>
                      {row.status === "PENDING" && canWrite ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          loading={cancellingId === row.id}
                          disabled={cancelMutation.isPending}
                          onClick={() => void handleCancel(row.id)}
                        >
                          {t("selfService.cancelLeave", "Cancel request")}
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/dashboard/my-workspace/leave/${row.id}`}>
                            {t("common.view", "View")}
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FadeIn>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("selfService.requestLeave", "Request leave")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleCreate(e)} noValidate>
            <ActionFeedback error={formError} />
            <SelectField
              id="self-leave-type"
              label={t("hr.leaveType", "Leave type")}
              value={type}
              onChange={(value) => setType(value as LeaveType)}
              options={leaveTypeOptions}
              required
              disabled={createMutation.isPending}
            />
            <FormField
              htmlFor="self-leave-start"
              label={t("hr.startDate", "Start date")}
              error={fieldErrors.startDate}
            >
              <DatePicker
                id="self-leave-start"
                value={startDate}
                onChange={setStartDate}
                disabled={createMutation.isPending}
              />
            </FormField>
            <FormField
              htmlFor="self-leave-end"
              label={t("hr.endDate", "End date")}
              error={fieldErrors.endDate}
            >
              <DatePicker
                id="self-leave-end"
                value={endDate}
                onChange={setEndDate}
                disabled={createMutation.isPending}
              />
            </FormField>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 px-3 py-2 text-sm">
              <span className="text-[var(--muted)]">
                {t("selfService.calculatedDays", "Days (calculated)")}:
              </span>{" "}
              <span className="font-semibold tabular-nums">{calculatedDays || "—"}</span>
            </div>
            <FormField htmlFor="self-leave-reason" label={t("hr.reason", "Reason")}>
              <textarea
                id="self-leave-reason"
                className={inputClassName}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={createMutation.isPending}
              />
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                {t("form.submit", "Submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
