"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { todayApiDate } from "@/lib/date";
import { useCreateLeaveRequest, useHrEmployees } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CreateLeaveRequestInput, LeaveType } from "@ierp/shared";

const LEAVE_TYPES: Array<{ value: LeaveType; label: string }> = [
  { value: "ANNUAL", label: "Annual" },
  { value: "SICK", label: "Sick" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "EMERGENCY", label: "Emergency" },
];

function countBusinessDays(start: string, end: string): number {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return 0;
  }
  let days = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(days, 0.5);
}

type CreateLeaveRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateOnSuccess?: boolean;
};

export function CreateLeaveRequestDialog({
  open,
  onOpenChange,
  navigateOnSuccess = true,
}: CreateLeaveRequestDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreateLeaveRequest();
  const { data: employeesData } = useHrEmployees({ active: true, page: 1, limit: 100 });

  const [employeeId, setEmployeeId] = useState("");
  const [assignedApproverId, setAssignedApproverId] = useState("");
  const [type, setType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState(() => todayApiDate());
  const [endDate, setEndDate] = useState(() => todayApiDate());
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const employeeOptions = useMemo(
    () =>
      (employeesData?.data ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.employeeNumber})`,
      })),
    [employeesData]
  );

  const approverOptions = useMemo(
    () =>
      (employeesData?.data ?? [])
        .filter((emp) => emp.id !== employeeId)
        .map((emp) => ({
          value: emp.id,
          label: `${emp.fullName} (${emp.employeeNumber})`,
        })),
    [employeesData, employeeId]
  );

  const busy = submitting || createMutation.isPending;

  function syncDaysFromRange(nextStart: string, nextEnd: string) {
    if (nextStart && nextEnd && nextEnd >= nextStart) {
      setDays(String(countBusinessDays(nextStart, nextEnd)));
    }
  }

  function resetForm() {
    setEmployeeId("");
    setAssignedApproverId("");
    setType("ANNUAL");
    const today = todayApiDate();
    setStartDate(today);
    setEndDate(today);
    setDays("1");
    setReason("");
    setFieldErrors({});
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!shouldAllowEditDialogClose(busy, next)) return;
    onOpenChange(next);
    if (!next) {
      setFieldErrors({});
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const errors: Record<string, string> = {};
    if (!employeeId) errors.employeeId = t("form.required", "Required");
    if (!startDate) errors.startDate = t("form.required", "Required");
    if (!endDate) errors.endDate = t("form.required", "Required");
    if (startDate && endDate && endDate < startDate) {
      errors.endDate = t("hr.dateOrderInvalid", "End date must be on or after start date.");
    }
    const daysValue = Number(days);
    if (!days.trim() || !Number.isFinite(daysValue) || daysValue < 0.5) {
      errors.days = t("hr.daysInvalid", "Enter at least 0.5 days.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateLeaveRequestInput = {
      employeeId,
      type,
      startDate,
      endDate,
      days: daysValue,
      reason: reason.trim() || undefined,
      ...(assignedApproverId ? { assignedApproverId } : {}),
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
      if (navigateOnSuccess) {
        const href = `/dashboard/hr/leave-requests/${created.id}`;
        startNavigation(href);
        router.push(href);
      }
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("hr.createLeaveRequest", "Create leave request")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />
          <SelectField
            id="create-leave-employee"
            label={t("hr.employee")}
            value={employeeId}
            onChange={(value) => {
              setEmployeeId(value);
              if (assignedApproverId === value) setAssignedApproverId("");
            }}
            options={[
              { value: "", label: t("hr.selectEmployee", "Select employee…") },
              ...employeeOptions,
            ]}
            required
            error={fieldErrors.employeeId}
            disabled={busy}
          />
          <SelectField
            id="create-leave-approver"
            label={t("hr.assignedApprover", "Assigned approver")}
            value={assignedApproverId}
            onChange={setAssignedApproverId}
            options={[
              { value: "", label: t("hr.selectApproverOptional", "Select approver (optional)…") },
              ...approverOptions,
            ]}
            disabled={busy}
          />
          <SelectField
            id="create-leave-type"
            label={t("hr.leaveType", "Leave type")}
            value={type}
            onChange={(v) => setType(v as LeaveType)}
            options={LEAVE_TYPES.map((opt) => ({
              value: opt.value,
              label: t(`hr.leaveType.${opt.value}`, opt.label),
            }))}
            disabled={busy}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              id="create-leave-start"
              label={t("hr.startDate", "Start date")}
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
                syncDaysFromRange(value, endDate);
              }}
              required
              error={fieldErrors.startDate}
              disabled={busy}
            />
            <DatePicker
              id="create-leave-end"
              label={t("hr.endDate", "End date")}
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
                syncDaysFromRange(startDate, value);
              }}
              required
              error={fieldErrors.endDate}
              disabled={busy}
            />
          </div>
          <FormField label={t("hr.days", "Days")} htmlFor="create-leave-days" required error={fieldErrors.days}>
            <input
              id="create-leave-days"
              type="number"
              min={0.5}
              step={0.5}
              className={inputClassName}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormField label={t("hr.reason", "Reason")} htmlFor="create-leave-reason">
            <textarea
              id="create-leave-reason"
              className={textareaClassName}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("hr.createLeaveRequest", "Create leave request")}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
