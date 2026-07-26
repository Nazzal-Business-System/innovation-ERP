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
import { inputClassName } from "@/lib/form-utils";
import { todayApiDate } from "@/lib/date";
import { useCreateEmployee, useHrDepartments, useHrPositions } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CreateEmployeeInput, EmploymentStatus } from "@ierp/shared";

const STATUS_OPTIONS: Array<{ value: EmploymentStatus; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "PROBATION", label: "Probation" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "TERMINATED", label: "Terminated" },
];

type CreateEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateEmployeeDialog({ open, onOpenChange }: CreateEmployeeDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreateEmployee();
  const { data: departments } = useHrDepartments();
  const [departmentId, setDepartmentId] = useState("");
  const { data: positionsData } = useHrPositions({
    departmentId: departmentId || undefined,
    page: 1,
  });

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionId, setPositionId] = useState("");
  const [hireDate, setHireDate] = useState(() => todayApiDate());
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>("ACTIVE");
  const [workLocation, setWorkLocation] = useState("Amman HQ");
  const [salary, setSalary] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departmentOptions = useMemo(
    () =>
      (departments?.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [departments]
  );

  const positionOptions = useMemo(
    () =>
      (positionsData?.data ?? []).map((p) => ({
        value: p.id,
        label: `${p.title} (${p.level})`,
      })),
    [positionsData]
  );

  function resetForm() {
    setEmployeeNumber("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDepartmentId("");
    setPositionId("");
    setHireDate(todayApiDate());
    setEmploymentStatus("ACTIVE");
    setWorkLocation("Amman HQ");
    setSalary("");
    setFieldErrors({});
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!shouldAllowEditDialogClose(submitting, next)) return;
    onOpenChange(next);
    if (!next) {
      setFieldErrors({});
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || createMutation.isPending) return;

    const errors: Record<string, string> = {};
    if (!employeeNumber.trim()) errors.employeeNumber = t("form.required", "Required");
    if (!firstName.trim()) errors.firstName = t("form.required", "Required");
    if (!lastName.trim()) errors.lastName = t("form.required", "Required");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = t("form.invalidEmail", "Enter a valid email address.");
    }
    if (!departmentId) errors.departmentId = t("form.required", "Required");
    if (!positionId) errors.positionId = t("form.required", "Required");
    if (!workLocation.trim()) errors.workLocation = t("form.required", "Required");
    if (!hireDate) errors.hireDate = t("form.required", "Required");
    const salaryValue = salary.trim() ? Number(salary) : undefined;
    if (salary.trim() && (!Number.isFinite(salaryValue) || (salaryValue ?? 0) < 0)) {
      errors.salary = t("masterData.priceInvalid");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateEmployeeInput = {
      employeeNumber: employeeNumber.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      departmentId,
      positionId,
      hireDate,
      employmentStatus,
      workLocation: workLocation.trim(),
      salary: salaryValue,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
      const href = `/dashboard/hr/employees/${created.id}`;
      startNavigation(href);
      router.push(href);
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
          <DialogTitle>{t("masterData.createEmployee", "Create employee")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <ActionFeedback error={error} />
          <FormField
            label={t("masterData.employeeNumber")}
            required
            error={fieldErrors.employeeNumber}
          >
            <input
              className={inputClassName}
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("masterData.firstName", "First name")} required error={fieldErrors.firstName}>
              <input
                className={inputClassName}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={submitting}
              />
            </FormField>
            <FormField label={t("masterData.lastName", "Last name")} required error={fieldErrors.lastName}>
              <input
                className={inputClassName}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("masterData.email")} required error={fieldErrors.email}>
              <input
                type="email"
                className={inputClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </FormField>
            <FormField label={t("masterData.phone")}>
              <input
                className={inputClassName}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </div>
          <SelectField
            id="create-emp-dept"
            label={t("masterData.department")}
            value={departmentId}
            onChange={(v) => {
              setDepartmentId(v);
              setPositionId("");
            }}
            options={departmentOptions}
            placeholder={t("form.select", "Select…")}
            required
            error={fieldErrors.departmentId}
            disabled={submitting}
          />
          <SelectField
            id="create-emp-pos"
            label={t("masterData.position")}
            value={positionId}
            onChange={setPositionId}
            options={positionOptions}
            placeholder={t("form.select", "Select…")}
            required
            error={fieldErrors.positionId}
            disabled={submitting || !departmentId}
          />
          <DatePicker
            id="create-emp-hire"
            label={t("masterData.hireDate")}
            value={hireDate}
            onChange={setHireDate}
            disabled={submitting}
          />
          <SelectField
            id="create-emp-status"
            label={t("masterData.employmentStatus", "Employment status")}
            value={employmentStatus}
            onChange={(v) => setEmploymentStatus(v as EmploymentStatus)}
            options={STATUS_OPTIONS}
            disabled={submitting}
          />
          <FormField
            label={t("masterData.workLocation")}
            required
            error={fieldErrors.workLocation}
          >
            <input
              className={inputClassName}
              value={workLocation}
              onChange={(e) => setWorkLocation(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormField label={t("hr.baseSalary")} error={fieldErrors.salary}>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClassName}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              disabled={submitting}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("masterData.createEmployee", "Create employee")}
            loading={submitting}
            disabled={submitting}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
