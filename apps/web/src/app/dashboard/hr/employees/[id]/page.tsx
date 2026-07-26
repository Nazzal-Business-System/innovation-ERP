"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Power, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrDetailSkeleton } from "@/components/hr/hr-page-skeleton";
import { EMPLOYMENT_STATUS_LABELS } from "@/components/hr/hr-status-badge";
import { EmployeeEmploymentSummary } from "@/components/hr/employee-employment-summary";
import { EmployeeProfileHeader } from "@/components/hr/employee-profile-header";
import {
  EmployeeHrSnapshot,
  EmployeeReportingStructure,
} from "@/components/hr/employee-hr-snapshot";
import {
  EntityAudit,
  EntityLinkedAttachments,
  EntityNotesEditor,
  EntityTimeline,
  HrWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import {
  mapMasterDataAudit,
  mapMasterDataTimeline,
} from "@/lib/entity-workspace/master-data-lifecycle";
import {
  useHrDepartments,
  useHrEmployee,
  useHrEmployees,
  useHrPositions,
  useSetEmployeeLifecycle,
  useUpdateEmployee,
} from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { HR_PERMISSIONS } from "@ierp/shared";
import type { EmploymentStatus, HrEmployeeDetail } from "@ierp/shared";

const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "ACTIVE", label: EMPLOYMENT_STATUS_LABELS.ACTIVE },
  { value: "ON_LEAVE", label: EMPLOYMENT_STATUS_LABELS.ON_LEAVE },
  { value: "TERMINATED", label: EMPLOYMENT_STATUS_LABELS.TERMINATED },
  { value: "PROBATION", label: EMPLOYMENT_STATUS_LABELS.PROBATION },
];

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const canViewSalary = canWrite;
  const { data: employee, loading, error, refetch } = useHrEmployee(id);
  const updateMutation = useUpdateEmployee();
  const lifecycleMutation = useSetEmployeeLifecycle();
  const { data: departmentsData } = useHrDepartments();
  const departments = departmentsData?.data ?? [];
  const { data: managersData } = useHrEmployees({ active: true, limit: 100, sort: "NAME_ASC" });
  const managerOptions = useMemo(
    () =>
      (managersData?.data ?? [])
        .filter((e) => e.id !== id)
        .map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeNumber})` })),
    [managersData?.data, id]
  );

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWorkLocation, setEditWorkLocation] = useState("");
  const [editHireDate, setEditHireDate] = useState("");
  const [editEmploymentStatus, setEditEmploymentStatus] = useState<EmploymentStatus>("ACTIVE");
  const [editSalary, setEditSalary] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editPositionId, setEditPositionId] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: positionsData } = useHrPositions({
    departmentId: editDepartmentId || undefined,
    page: 1,
  });
  const positions = positionsData?.data ?? [];

  useEffect(() => {
    if (!editOpen || positions.length === 0) return;
    if (!positions.some((p) => p.id === editPositionId)) {
      setEditPositionId(positions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDepartmentId, editOpen, positions]);

  function seedEditForm(entity: HrEmployeeDetail) {
    setEditFirstName(entity.firstName);
    setEditLastName(entity.lastName);
    setEditEmail(entity.email);
    setEditPhone(entity.phone ?? "");
    setEditWorkLocation(entity.workLocation);
    setEditHireDate(entity.hireDate.slice(0, 10));
    setEditEmploymentStatus(entity.employmentStatus);
    setEditSalary(entity.salary ? entity.salary.replace(/[^\d.]/g, "") : "");
    setEditNotes(entity.notes ?? "");
    setEditDepartmentId(entity.department.id);
    setEditPositionId(entity.position.id);
    setEditManagerId(entity.manager?.id ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!employee) return;
    seedEditForm(employee);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
    if (!open) {
      setEditErrors({});
      setEditError(null);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!employee || editSubmitting) return;

    const errors: Record<string, string> = {};
    if (!editFirstName.trim()) errors.firstName = t("masterData.firstNameRequired");
    if (!editLastName.trim()) errors.lastName = t("masterData.lastNameRequired");
    if (!editEmail.trim()) errors.email = t("masterData.emailRequired");
    else if (!/^\S+@\S+\.\S+$/.test(editEmail.trim())) errors.email = t("masterData.emailInvalid");
    if (!editHireDate) errors.hireDate = t("masterData.hireDateRequired", "Hire date is required");

    let salaryValue: number | null | undefined = undefined;
    if (canViewSalary) {
      salaryValue = null;
      if (editSalary.trim()) {
        const parsed = parseFloat(editSalary.replace(/[^\d.]/g, ""));
        if (Number.isNaN(parsed) || parsed < 0) {
          errors.salary = t("masterData.priceInvalid");
        } else {
          salaryValue = parsed;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setEditError(null);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditErrors({});
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          departmentId: editDepartmentId || undefined,
          positionId: editPositionId || undefined,
          managerId: editManagerId || null,
          hireDate: editHireDate,
          employmentStatus: editEmploymentStatus,
          workLocation: editWorkLocation.trim(),
          ...(canViewSalary ? { salary: salaryValue ?? null } : {}),
          notes: editNotes.trim() || null,
        },
      });
      setEditOpen(false);
      setActionSuccess(t("masterData.saved"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleLifecycleChange(active: boolean) {
    if (lifecycleMutation.isPending) return;
    setLifecycleError(null);
    setActionSuccess(null);
    try {
      await lifecycleMutation.mutateAsync({ id, active });
      setActionSuccess(
        active
          ? t("masterData.reactivateSuccess", "Employee reactivated")
          : t("masterData.deactivateSuccess", "Employee deactivated")
      );
    } catch (err) {
      setLifecycleError(mapTransactionUiError(err, t("form.submitFailed", "Action failed")));
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !employee) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="employee"
          entityId={id}
          error={error ?? t("masterData.employeeNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const headerActions: EntityAction[] = [
    {
      id: "edit",
      label: t("entityWorkspace.action.edit"),
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
      onSelect: openEditDialog,
      kind: "primary",
      capability: "edit",
    },
    ...(canWrite
      ? [
          {
            id: employee.isActive ? "deactivate" : "reactivate",
            label: employee.isActive
              ? t("masterData.deactivate", "Deactivate")
              : t("masterData.reactivate", "Reactivate"),
            icon: employee.isActive ? (
              <Power className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            ),
            onSelect: () => void handleLifecycleChange(!employee.isActive),
            kind: employee.isActive ? "destructive" : "secondary",
            capability: employee.isActive ? "archive" : "restore",
            pending: lifecycleMutation.isPending,
            confirm: employee.isActive ? "hard" : "soft",
            confirmTitle: `${employee.isActive ? t("masterData.deactivate", "Deactivate") : t("masterData.reactivate", "Reactivate")} — ${employee.fullName}`,
            confirmDescription: employee.isActive
              ? t(
                  "masterData.employeeDeactivateConsequence",
                  "This employee cannot receive new assignments. History remains available."
                )
              : t(
                  "masterData.employeeReactivateConsequence",
                  "This employee can receive new assignments again."
                ),
          } satisfies EntityAction,
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/employees">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("masterData.backToEmployees")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={lifecycleError} />
      <HrNavLinks />

      <HrWorkspace
        entityType="employee"
        entityId={employee.id}
        header={
          <EmployeeProfileHeader
            employee={employee}
            actions={headerActions}
            capabilities={canWrite ? ["edit", employee.isActive ? "archive" : "restore"] : []}
            canEditPhoto={canWrite}
            onPhotoSuccess={(message) => {
              setLifecycleError(null);
              setActionSuccess(message);
            }}
          />
        }
        main={
          <>
            <EmployeeEmploymentSummary employee={employee} />
            <EmployeeHrSnapshot employee={employee} />
            <EntityNotesEditor
              value={employee.notes}
              canEdit={canWrite}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />
            <EntityLinkedAttachments module="HR" entityType="employee" entityId={employee.id} />
            <EntityTimeline events={mapMasterDataTimeline(employee.timeline, locale, t)} />
          </>
        }
        sidebar={<EmployeeReportingStructure employee={employee} />}
        footer={<EntityAudit meta={mapMasterDataAudit(employee.id, employee.audit, locale)} />}
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("masterData.editEmployee")}</DialogTitle>
          </DialogHeader>
          <form
            id="employee-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField
              label={t("masterData.employeeNumber")}
              htmlFor="edit-employee-number"
              hint={t("masterData.employeeNumberLocked")}
            >
              <input
                id="edit-employee-number"
                className={inputClassName}
                value={employee.employeeNumber}
                disabled
                readOnly
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={t("masterData.firstName")}
                htmlFor="edit-employee-first-name"
                required
                error={editErrors.firstName}
              >
                <input
                  id="edit-employee-first-name"
                  className={inputClassName}
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.lastName")}
                htmlFor="edit-employee-last-name"
                required
                error={editErrors.lastName}
              >
                <input
                  id="edit-employee-last-name"
                  className={inputClassName}
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.email")}
                htmlFor="edit-employee-email"
                required
                error={editErrors.email}
              >
                <input
                  id="edit-employee-email"
                  type="email"
                  className={inputClassName}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField label={t("masterData.phone")} htmlFor="edit-employee-phone">
                <input
                  id="edit-employee-phone"
                  className={inputClassName}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              <SelectField
                id="edit-employee-department"
                label={t("masterData.department")}
                value={editDepartmentId}
                onChange={setEditDepartmentId}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                disabled={editSubmitting}
                required
              />
              <SelectField
                id="edit-employee-position"
                label={t("masterData.position")}
                value={editPositionId}
                onChange={setEditPositionId}
                options={positions.map((p) => ({ value: p.id, label: p.title }))}
                disabled={editSubmitting || positions.length === 0}
                required
              />
              <SelectField
                id="edit-employee-manager"
                label={t("masterData.manager")}
                value={editManagerId}
                onChange={setEditManagerId}
                options={[{ value: "", label: t("hr.noManager", "No manager") }, ...managerOptions]}
                disabled={editSubmitting}
              />
              <FormField label={t("masterData.workLocation")} htmlFor="edit-employee-location" required>
                <input
                  id="edit-employee-location"
                  className={inputClassName}
                  value={editWorkLocation}
                  onChange={(e) => setEditWorkLocation(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("masterData.hireDate")}
                htmlFor="edit-employee-hire-date"
                required
                error={editErrors.hireDate}
              >
                <input
                  id="edit-employee-hire-date"
                  type="date"
                  className={inputClassName}
                  value={editHireDate}
                  onChange={(e) => setEditHireDate(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <SelectField
                id="edit-employee-status"
                label={t("masterData.employmentStatus")}
                value={editEmploymentStatus}
                onChange={(v) => setEditEmploymentStatus(v as EmploymentStatus)}
                options={EMPLOYMENT_STATUS_OPTIONS}
                disabled={editSubmitting}
              />
              {canViewSalary ? (
                <FormField label={t("masterData.salary")} htmlFor="edit-employee-salary" error={editErrors.salary}>
                  <input
                    id="edit-employee-salary"
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClassName}
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    disabled={editSubmitting}
                  />
                </FormField>
              ) : null}
            </div>

            <FormField label={t("form.notes")} htmlFor="edit-employee-notes">
              <textarea
                id="edit-employee-notes"
                className={textareaClassName}
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>

            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("masterData.saveChanges")}
              loading={editSubmitting}
              loadingLabel={t("form.saving", "Saving…")}
              disabled={editSubmitting}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
