"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pencil, UserCog, XCircle } from "lucide-react";
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
import { LEAVE_TYPE_LABELS } from "@/components/hr/hr-status-badge";
import {
  EntityActionBar,
  EntityAudit,
  EntityHeader,
  EntityMetrics,
  EntityNotes,
  EntityProfileGroups,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  HrWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import {
  useHrEmployees,
  useHrLeaveRequest,
  useUpdateLeaveRequest,
  useUpdateLeaveRequestStatus,
} from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatDisplayDate, formatDisplayDateRange, formatDisplayDateTime } from "@/lib/date";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { HR_PERMISSIONS } from "@ierp/shared";
import type { BadgeProps } from "@/components/ui/badge";
import type { LeaveStatus, LeaveType } from "@ierp/shared";

const LEAVE_TYPE_OPTIONS = Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const LEAVE_WORKFLOW = [
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
];

function leaveStatusVariant(status: LeaveStatus): BadgeProps["variant"] {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "destructive";
    case "PENDING":
      return "warning";
    default:
      return transactionStatusVariant(status);
  }
}

export default function LeaveRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const { data: leave, loading, error, refetch } = useHrLeaveRequest(id);
  const { data: employeesData } = useHrEmployees({ active: true, page: 1, limit: 100 });
  const statusMutation = useUpdateLeaveRequestStatus();
  const updateMutation = useUpdateLeaveRequest();
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [approverOpen, setApproverOpen] = useState(false);
  const [editType, setEditType] = useState<LeaveType>("ANNUAL");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDays, setEditDays] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editApproverId, setEditApproverId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [approverSubmitting, setApproverSubmitting] = useState(false);
  const [approverError, setApproverError] = useState<string | null>(null);

  const approverOptions = useMemo(
    () =>
      (employeesData?.data ?? [])
        .filter((emp) => emp.id !== leave?.employee.id)
        .map((emp) => ({
          value: emp.id,
          label: `${emp.fullName} (${emp.employeeNumber})`,
        })),
    [employeesData, leave?.employee.id]
  );

  function openEditDialog() {
    if (!leave) return;
    setEditType(leave.type);
    setEditStart(leave.startDate);
    setEditEnd(leave.endDate);
    setEditDays(String(leave.days));
    setEditReason(leave.reason ?? "");
    setEditApproverId(leave.assignedApprover?.id ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  function openApproverDialog() {
    if (!leave) return;
    setEditApproverId(leave.assignedApprover?.id ?? "");
    setApproverError(null);
    setApproverOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }

  function handleApproverOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(approverSubmitting, open)) return;
    setApproverOpen(open);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leave || editSubmitting) return;
    const days = Number(editDays);
    if (!editStart || !editEnd || !Number.isFinite(days) || days <= 0) {
      setEditError(t("form.validationError", "Check the entered values."));
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const selectedApprover = editApproverId
        ? (employeesData?.data ?? []).find((emp) => emp.id === editApproverId)
        : null;
      await updateMutation.mutateAsync({
        id,
        input: {
          type: editType,
          startDate: editStart,
          endDate: editEnd,
          days,
          reason: editReason.trim() || null,
          assignedApproverId: editApproverId || null,
        },
        assignedApprover: selectedApprover
          ? { id: selectedApprover.id, fullName: selectedApprover.fullName }
          : null,
      });
      setEditOpen(false);
      setActionSuccess(t("masterData.saved"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleApproverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leave || approverSubmitting) return;
    setApproverSubmitting(true);
    setApproverError(null);
    try {
      const selectedApprover = editApproverId
        ? (employeesData?.data ?? []).find((emp) => emp.id === editApproverId)
        : null;
      await updateMutation.mutateAsync({
        id,
        input: { assignedApproverId: editApproverId || null },
        assignedApprover: selectedApprover
          ? { id: selectedApprover.id, fullName: selectedApprover.fullName }
          : null,
      });
      setApproverOpen(false);
      setActionSuccess(t("hr.approverUpdated", "Assigned approver updated."));
    } catch (err) {
      setApproverError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setApproverSubmitting(false);
    }
  }

  async function handleStatusChange(status: "APPROVED" | "REJECTED") {
    if (statusMutation.isPending || pendingAction) return;
    setPendingAction(status);
    setActionError(null);
    setActionSuccess(null);
    try {
      await statusMutation.mutateAsync({ id, status, employeeId: leave?.employee.id });
      setActionSuccess(
        status === "APPROVED" ? t("action.leaveApproved") : t("action.leaveRejected")
      );
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !leave) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="leave_request"
          entityId={id}
          error={error ?? t("hr.leaveNotFound", "Leave request not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canReview = canWrite && leave.status === "PENDING";
  const decisionLabel =
    leave.status === "APPROVED"
      ? t("hr.approvedBy", "Approved by")
      : leave.status === "REJECTED"
        ? t("hr.rejectedBy", "Rejected by")
        : null;
  const decisionAtLabel =
    leave.status === "APPROVED"
      ? t("hr.approvedAt", "Approved at")
      : leave.status === "REJECTED"
        ? t("hr.rejectedAt", "Rejected at")
        : null;

  const headerActions: EntityAction[] = canReview
    ? [
        {
          id: "edit",
          label: t("entityWorkspace.action.edit"),
          icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
          kind: "primary",
          capability: "edit",
          onSelect: openEditDialog,
        },
        {
          id: "assign-approver",
          label: t("hr.changeApprover", "Change approver"),
          icon: <UserCog className="h-3.5 w-3.5" aria-hidden />,
          kind: "secondary",
          capability: "edit",
          onSelect: openApproverDialog,
        },
        {
          id: "approve",
          label: t("action.approveLeave"),
          icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
          kind: "secondary",
          capability: "approve",
          pending: pendingAction === "APPROVED",
          confirm: "soft",
          confirmTitle: t("action.approveLeave"),
          confirmDescription: t("action.approveLeaveConfirm"),
          onSelect: () => void handleStatusChange("APPROVED"),
        },
        {
          id: "reject",
          label: t("action.rejectLeave"),
          icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
          kind: "destructive",
          capability: "approve",
          pending: pendingAction === "REJECTED",
          confirm: "hard",
          confirmTitle: t("action.rejectLeave"),
          confirmDescription: t("action.rejectLeaveConfirm"),
          onSelect: () => void handleStatusChange("REJECTED"),
        },
      ]
    : [];

  const workflowSteps =
    leave.status === "REJECTED"
      ? [
          { id: "PENDING", label: "Pending", done: true },
          { id: "REJECTED", label: "Rejected", active: true },
        ]
      : buildLinearWorkflowSteps(LEAVE_WORKFLOW, leave.status === "APPROVED" ? "APPROVED" : "PENDING");

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/leave-requests">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("hr.backToLeaveRequests", "Back to leave requests")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <HrNavLinks />

      <HrWorkspace
        entityType="leave_request"
        entityId={leave.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.leaveRequests"), href: "/dashboard/hr/leave-requests" },
              { label: LEAVE_TYPE_LABELS[leave.type] },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={`${LEAVE_TYPE_LABELS[leave.type]} Leave`}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{leave.employee.fullName}</span>
                      <span className="ew-ltr-isolate">
                        · {formatDisplayDateRange(leave.startDate, leave.endDate, locale)}
                      </span>
                    </span>
                  }
                  trailing={
                    <EntityStatus
                      label={statusLabel(leave.status)}
                      variant={leaveStatusVariant(leave.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", "approve"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "days",
                label: t("hr.daysRequested", "Days requested"),
                value: <span className="ew-ltr-isolate">{leave.days}</span>,
              },
              {
                id: "start",
                label: t("hr.startDate"),
                value: <span className="ew-ltr-isolate">{formatDisplayDate(leave.startDate, locale)}</span>,
              },
              {
                id: "end",
                label: t("hr.endDate"),
                value: <span className="ew-ltr-isolate">{formatDisplayDate(leave.endDate, locale)}</span>,
              },
              {
                id: "type",
                label: t("hr.leaveType", "Type"),
                value: LEAVE_TYPE_LABELS[leave.type],
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityProfileGroups
                groups={[
                  {
                    id: "employee",
                    title: t("hr.employee"),
                    rows: [
                      {
                        id: "name",
                        label: t("hr.employeeName", "Name"),
                        value: (
                          <Link
                            href={`/dashboard/hr/employees/${leave.employee.id}`}
                            className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
                          >
                            {leave.employee.fullName}
                          </Link>
                        ),
                      },
                      {
                        id: "employee-number",
                        label: t("masterData.employeeNumber"),
                        value: leave.employee.employeeNumber,
                        mono: true,
                      },
                      {
                        id: "position",
                        label: t("masterData.position"),
                        value: leave.employee.position,
                      },
                    ],
                  },
                  {
                    id: "organization",
                    title: t("hr.organization", "Organization"),
                    rows: [
                      {
                        id: "department",
                        label: t("masterData.department"),
                        value: leave.employee.department,
                      },
                      {
                        id: "location",
                        label: t("masterData.workLocation"),
                        value: leave.employee.workLocation,
                      },
                    ],
                  },
                  {
                    id: "contact",
                    title: t("hr.contact", "Contact"),
                    rows: [
                      {
                        id: "email",
                        label: t("masterData.email"),
                        value: leave.employee.email ? (
                          <a
                            href={`mailto:${leave.employee.email}`}
                            className="cursor-pointer text-[var(--accent)] hover:underline"
                          >
                            {leave.employee.email}
                          </a>
                        ) : (
                          "—"
                        ),
                      },
                    ],
                  },
                ]}
              />
            </EntitySection>

            <EntityNotes
              notes={leave.reason ? [{ id: "reason", body: leave.reason }] : []}
              title={t("hr.reason", "Reason")}
            />

            <EntityAudit
              meta={{
                id: leave.id,
                createdAt: formatDisplayDateTime(leave.createdAt, locale),
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(leave.status)}
              steps={workflowSteps}
              defaultOpen
            />

            <EntitySection id="approval" title={t("hr.approval", "Approval")} defaultOpen>
              <dl className="space-y-3 text-sm">
                {leave.status === "PENDING" || leave.assignedApprover ? (
                  <div>
                    <dt className="text-xs text-[var(--muted)]">
                      {t("hr.assignedApprover", "Assigned approver")}
                    </dt>
                    <dd className="mt-0.5 font-medium">
                      {leave.assignedApprover?.fullName ?? t("hr.notAssigned", "Not assigned")}
                    </dd>
                  </div>
                ) : null}

                {leave.status === "PENDING" ? (
                  <div>
                    <dt className="text-xs text-[var(--muted)]">{t("hr.decision", "Decision")}</dt>
                    <dd className="mt-0.5 font-medium text-[var(--warning)]">
                      {t("hr.awaitingApproval", "Awaiting approval")}
                    </dd>
                  </div>
                ) : (
                  <>
                    <div>
                      <dt className="text-xs text-[var(--muted)]">{decisionLabel}</dt>
                      <dd className="mt-0.5 font-medium">
                        {leave.decidedBy?.name ?? t("hr.notRecorded", "Not recorded")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--muted)]">{decisionAtLabel}</dt>
                      <dd className="mt-0.5 font-medium">
                        {leave.decidedAt ? (
                          <span className="ew-ltr-isolate">
                            {formatDisplayDateTime(leave.decidedAt, locale)}
                          </span>
                        ) : (
                          t("hr.notRecorded", "Not recorded")
                        )}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {canReview ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 cursor-pointer gap-2"
                  onClick={openApproverDialog}
                >
                  <UserCog className="h-3.5 w-3.5" aria-hidden />
                  {t("hr.changeApprover", "Change approver")}
                </Button>
              ) : null}
            </EntitySection>

            <EntityRelations
              items={[
                {
                  id: "employee",
                  label: leave.employee.fullName,
                  description: t("hr.employee"),
                  meta: leave.employee.employeeNumber,
                  href: `/dashboard/hr/employees/${leave.employee.id}`,
                },
              ]}
            />
          </>
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("entityWorkspace.action.edit")} — {LEAVE_TYPE_LABELS[leave.type]}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <SelectField
              id="leave-type"
              label={t("hr.leaveType", "Type")}
              value={editType}
              onChange={(v) => setEditType(v as LeaveType)}
              options={LEAVE_TYPE_OPTIONS}
              disabled={editSubmitting}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DatePicker
                id="leave-start"
                label={t("hr.startDate")}
                value={editStart}
                onChange={setEditStart}
                disabled={editSubmitting}
              />
              <DatePicker
                id="leave-end"
                label={t("hr.endDate")}
                value={editEnd}
                onChange={setEditEnd}
                disabled={editSubmitting}
              />
              <FormField label={t("hr.daysRequested", "Days requested")} required>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className={inputClassName}
                  value={editDays}
                  onChange={(e) => setEditDays(e.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
            </div>
            <SelectField
              id="leave-assigned-approver"
              label={t("hr.assignedApprover", "Assigned approver")}
              value={editApproverId}
              onChange={setEditApproverId}
              options={[
                { value: "", label: t("hr.notAssigned", "Not assigned") },
                ...approverOptions,
              ]}
              disabled={editSubmitting}
            />
            <FormField label={t("hr.reason", "Reason")}>
              <textarea
                className={textareaClassName}
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("masterData.saveChanges")}
              loading={editSubmitting}
              disabled={editSubmitting}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={approverOpen} onOpenChange={handleApproverOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("hr.changeApprover", "Change approver")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleApproverSubmit(e)}>
            <ActionFeedback error={approverError} />
            <SelectField
              id="leave-change-approver"
              label={t("hr.assignedApprover", "Assigned approver")}
              value={editApproverId}
              onChange={setEditApproverId}
              options={[
                { value: "", label: t("hr.notAssigned", "Not assigned") },
                ...approverOptions,
              ]}
              disabled={approverSubmitting}
            />
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("masterData.saveChanges")}
              loading={approverSubmitting}
              disabled={approverSubmitting}
              onCancel={() => handleApproverOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
