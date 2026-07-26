"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrDetailSkeleton } from "@/components/hr/hr-page-skeleton";
import { ContractPreviewPanel } from "@/components/hr/contract-preview-panel";
import { ContractTypeLabel } from "@/components/hr/hr-status-badge";
import {
  EntityAudit,
  EntityActionBar,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotesEditor,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  HrWorkspace,
} from "@/components/entity-workspace";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useHrContract, useUpdateContract } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate, formatDisplayDateRange } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import type { EntityAction } from "@/lib/entity-workspace";
import type { BadgeProps } from "@/components/ui/badge";
import { HR_PERMISSIONS, type ContractStatus, type ContractType } from "@ierp/shared";

const CONTRACT_TYPE_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: "FULL_TIME", label: "Full time" }, { value: "PART_TIME", label: "Part time" },
  { value: "TEMPORARY", label: "Temporary" }, { value: "INTERNSHIP", label: "Internship" },
  { value: "CONSULTANT", label: "Consultant" },
];
const CONTRACT_STATUS_OPTIONS: Array<{ value: ContractStatus; label: string }> = [
  { value: "DRAFT", label: "Draft" }, { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" }, { value: "TERMINATED", label: "Terminated" },
];

const CONTRACT_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "ACTIVE", label: "Active" },
];

function contractStatusVariant(status: ContractStatus): BadgeProps["variant"] {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "EXPIRED":
      return "warning";
    case "TERMINATED":
      return "destructive";
    case "DRAFT":
      return "secondary";
    default:
      return transactionStatusVariant(status);
  }
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const { data: contract, loading, error, refetch } = useHrContract(id);
  const updateMutation = useUpdateContract();
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<ContractType>("FULL_TIME");
  const [editStatus, setEditStatus] = useState<ContractStatus>("DRAFT");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function openEditDialog() {
    if (!contract) return;
    setEditType(contract.contractType); setEditStatus(contract.status); setEditStart(contract.startDate);
    setEditEnd(contract.endDate ?? ""); setEditSalary(contract.salary.replace(/[^\d.]/g, ""));
    setEditError(null); setEditOpen(true);
  }
  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    const salary = Number(editSalary);
    if (!contract || editSubmitting || !editStart || !Number.isFinite(salary) || salary < 0) return;
    setEditSubmitting(true); setEditError(null);
    try {
      await updateMutation.mutateAsync({ id, input: { contractType: editType, status: editStatus, startDate: editStart, endDate: editEnd || null, salary } });
      setEditOpen(false); setActionSuccess(t("masterData.saved"));
    } catch (err) { setEditError(mapTransactionUiError(err, t("form.submitFailed"))); }
    finally { setEditSubmitting(false); }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !contract) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="employee_contract"
          entityId={id}
          error={error ?? t("hr.contractNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const workflowSteps =
    contract.status === "EXPIRED" || contract.status === "TERMINATED"
      ? [
          { id: "DRAFT", label: "Draft", done: true },
          { id: "ACTIVE", label: "Active", done: true },
          {
            id: contract.status,
            label: t(`hr.contractStatus.${contract.status}`, statusLabel(contract.status)),
            active: true,
          },
        ]
      : buildLinearWorkflowSteps(
          CONTRACT_WORKFLOW,
          contract.status === "ACTIVE" ? "ACTIVE" : "DRAFT"
        );
  const headerActions: EntityAction[] = canWrite ? [{
    id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
    kind: "primary", capability: "edit", onSelect: openEditDialog,
  }] : [];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/contracts">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("hr.backToContracts")}
          </Link>
        </Button>
      </div>

      <HrNavLinks />
      <ActionFeedback success={actionSuccess} />

      <HrWorkspace
        entityType="employee_contract"
        entityId={contract.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("hr.contractsTitle"), href: "/dashboard/hr/contracts" },
              { label: contract.contractNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{contract.contractNumber}</span>}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{contract.employee.fullName}</span>
                      <span className="ew-ltr-isolate">
                        · {formatDisplayDateRange(contract.startDate, contract.endDate, locale)}
                      </span>
                    </span>
                  }
                  trailing={
                    <div className="flex flex-wrap items-center gap-2">
                      <EntityStatus
                        label={t(
                          `hr.contractStatus.${contract.status}`,
                          statusLabel(contract.status)
                        )}
                        variant={contractStatusVariant(contract.status)}
                      />
                      {contract.isExpiringSoon ? (
                        <EntityStatus label={t("hr.expiringSoon")} variant="warning" />
                      ) : null}
                    </div>
                  }
                />
              </div>
              <EntityActionBar actions={headerActions} capabilities={canWrite ? ["edit"] : []} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "type",
                label: t("hr.contractType"),
                value: <ContractTypeLabel type={contract.contractType} />,
              },
              {
                id: "salary",
                label: t("hr.salary"),
                value: <span className="ew-ltr-isolate">{contract.salary}</span>,
              },
              {
                id: "start",
                label: t("hr.startDate"),
                value: <span className="ew-ltr-isolate">{formatDisplayDate(contract.startDate, locale)}</span>,
              },
              {
                id: "end",
                label: t("hr.endDate"),
                value: (
                  <span className="ew-ltr-isolate">
                    {contract.endDate ? formatDisplayDate(contract.endDate, locale) : t("hr.openEnded")}
                  </span>
                ),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="preview" title={t("hr.contractPreview")} defaultOpen>
              <ContractPreviewPanel contract={contract} />
            </EntitySection>

            <EntitySection id="terms" title={t("hr.contractTerms")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "employee",
                    label: t("hr.employee"),
                    value: (
                      <Link
                        href={`/dashboard/hr/employees/${contract.employee.id}`}
                        className="cursor-pointer text-[var(--accent)] hover:underline"
                      >
                        {contract.employee.fullName}
                      </Link>
                    ),
                    span: "md",
                  },
                  {
                    id: "employee-number",
                    label: t("masterData.employeeNumber", "Employee #"),
                    value: contract.employee.employeeNumber,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "department",
                    label: t("masterData.department"),
                    value: contract.employee.department,
                    span: "sm",
                  },
                  {
                    id: "position",
                    label: t("masterData.position"),
                    value: contract.employee.position,
                    span: "sm",
                  },
                  {
                    id: "type",
                    label: t("hr.contractType"),
                    value: <ContractTypeLabel type={contract.contractType} />,
                    span: "sm",
                  },
                  {
                    id: "salary",
                    label: t("hr.salary"),
                    value: contract.salary,
                    mono: true,
                    span: "sm",
                  },
                ]}
              />
            </EntitySection>

            <EntityNotesEditor value={contract.notes} canEdit={canWrite} onSave={async (notes) => {
              await updateMutation.mutateAsync({ id, input: { notes } });
            }} />

            <EntityLinkedAttachments
              module="HR"
              entityType="employee_contract"
              entityId={contract.id}
            />
          </>
        }
        footer={<EntityAudit meta={{ id: contract.id }} />}
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={t(
                `hr.contractStatus.${contract.status}`,
                statusLabel(contract.status)
              )}
              steps={workflowSteps}
              defaultOpen
            />
            <EntityOwner
              name={contract.employee.fullName}
              role={t("hr.employee")}
              defaultOpen
            />
            <EntityRelations
              items={[
                {
                  id: "employee",
                  label: contract.employee.fullName,
                  description: t("hr.employee"),
                  meta: contract.employee.employeeNumber,
                  href: `/dashboard/hr/employees/${contract.employee.id}`,
                },
              ]}
            />
            {contract.isExpiringSoon ? (
              <EntitySection id="alerts" title={t("hr.contractsTitle")} defaultOpen>
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("hr.expiringSoon")}
                />
              </EntitySection>
            ) : null}
          </>
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {contract.contractNumber}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="contract-type" label={t("hr.contractType")} value={editType} onChange={(v) => setEditType(v as ContractType)} options={CONTRACT_TYPE_OPTIONS} disabled={editSubmitting} />
              <SelectField id="contract-status" label="Status" value={editStatus} onChange={(v) => setEditStatus(v as ContractStatus)} options={CONTRACT_STATUS_OPTIONS} disabled={editSubmitting} />
              <DatePicker id="contract-start" label={t("hr.startDate")} value={editStart} onChange={setEditStart} disabled={editSubmitting} />
              <DatePicker id="contract-end" label={t("hr.endDate")} value={editEnd} onChange={setEditEnd} optional disabled={editSubmitting} />
              <FormField label={t("hr.salary")} required><input type="number" min={0} step="0.01" className={inputClassName} value={editSalary} onChange={(e) => setEditSalary(e.target.value)} disabled={editSubmitting} /></FormField>
            </div>
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("masterData.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
