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
import { useCreateContract, useHrEmployees } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { ContractStatus, ContractType, CreateContractInput } from "@ierp/shared";

const CONTRACT_TYPES: Array<{ value: ContractType; label: string }> = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "CONSULTANT", label: "Consultant" },
];

const CONTRACT_STATUSES: Array<{ value: ContractStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
];

type CreateContractDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateOnSuccess?: boolean;
};

export function CreateContractDialog({
  open,
  onOpenChange,
  navigateOnSuccess = true,
}: CreateContractDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreateContract();
  const { data: employeesData } = useHrEmployees({ active: true, page: 1, limit: 100 });

  const [employeeId, setEmployeeId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractType, setContractType] = useState<ContractType>("FULL_TIME");
  const [startDate, setStartDate] = useState(() => todayApiDate());
  const [endDate, setEndDate] = useState("");
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState<ContractStatus>("ACTIVE");
  const [notes, setNotes] = useState("");
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

  const busy = submitting || createMutation.isPending;

  function resetForm() {
    setEmployeeId("");
    setContractNumber("");
    setContractType("FULL_TIME");
    setStartDate(todayApiDate());
    setEndDate("");
    setSalary("");
    setStatus("ACTIVE");
    setNotes("");
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
    if (!contractNumber.trim()) errors.contractNumber = t("form.required", "Required");
    if (!startDate) errors.startDate = t("form.required", "Required");
    if (endDate && startDate && endDate < startDate) {
      errors.endDate = t("hr.dateOrderInvalid", "End date must be on or after start date.");
    }
    const salaryValue = Number(salary);
    if (!salary.trim() || !Number.isFinite(salaryValue) || salaryValue < 0) {
      errors.salary = t("masterData.priceInvalid");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateContractInput = {
      employeeId,
      contractNumber: contractNumber.trim(),
      contractType,
      startDate,
      endDate: endDate || undefined,
      salary: salaryValue,
      status,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
      if (navigateOnSuccess) {
        const href = `/dashboard/hr/contracts/${created.id}`;
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
          <DialogTitle>{t("hr.createContract", "Create contract")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />
          <SelectField
            id="create-contract-employee"
            label={t("hr.employee")}
            value={employeeId}
            onChange={setEmployeeId}
            options={[
              { value: "", label: t("hr.selectEmployee", "Select employee…") },
              ...employeeOptions,
            ]}
            required
            error={fieldErrors.employeeId}
            disabled={busy}
          />
          <FormField
            label={t("hr.contractNumber", "Contract number")}
            htmlFor="create-contract-number"
            required
            error={fieldErrors.contractNumber}
          >
            <input
              id="create-contract-number"
              className={`${inputClassName} font-mono`}
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="create-contract-type"
              label={t("hr.contractTypeLabel", "Contract type")}
              value={contractType}
              onChange={(v) => setContractType(v as ContractType)}
              options={CONTRACT_TYPES.map((opt) => ({
                value: opt.value,
                label: t(`hr.contractType.${opt.value}`, opt.label),
              }))}
              disabled={busy}
            />
            <SelectField
              id="create-contract-status"
              label={t("hr.status", "Status")}
              value={status}
              onChange={(v) => setStatus(v as ContractStatus)}
              options={CONTRACT_STATUSES.map((opt) => ({
                value: opt.value,
                label: t(`hr.contractStatus.${opt.value}`, opt.label),
              }))}
              disabled={busy}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              id="create-contract-start"
              label={t("hr.startDate", "Start date")}
              value={startDate}
              onChange={setStartDate}
              required
              error={fieldErrors.startDate}
              disabled={busy}
            />
            <DatePicker
              id="create-contract-end"
              label={t("hr.endDate", "End date")}
              value={endDate}
              onChange={setEndDate}
              optional
              error={fieldErrors.endDate}
              disabled={busy}
            />
          </div>
          <FormField label={t("hr.salary", "Salary")} htmlFor="create-contract-salary" required error={fieldErrors.salary}>
            <input
              id="create-contract-salary"
              type="number"
              min={0}
              step="0.01"
              className={inputClassName}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormField label={t("masterData.notes", "Notes")} htmlFor="create-contract-notes">
            <textarea
              id="create-contract-notes"
              className={textareaClassName}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("hr.createContract", "Create contract")}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
