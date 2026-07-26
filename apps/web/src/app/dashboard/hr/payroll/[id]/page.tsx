"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Banknote, CheckCircle2, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { SelectionCheckbox } from "@/components/data-display/selection-checkbox";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrDetailSkeleton } from "@/components/hr/hr-page-skeleton";
import type { PayrollPayDialogMode } from "@/components/hr/pay-payroll-dialog";
import { EntityActionBar } from "@/components/entity-workspace/entity-action-bar";
import { EntityAudit } from "@/components/entity-workspace/entity-audit";
import { EntityEmptyState } from "@/components/entity-workspace/entity-empty-state";
import { EntityFieldGrid } from "@/components/entity-workspace/entity-field-grid";
import { EntityHeader } from "@/components/entity-workspace/entity-header";
import { EntityMetrics } from "@/components/entity-workspace/entity-metrics";
import { EntityNotesEditor } from "@/components/entity-workspace/entity-notes-editor";
import { EntityOwner, EntityWorkflow } from "@/components/entity-workspace/entity-owner";
import { EmployeePersonChip } from "@/components/avatar/person-chips";
import { EntitySection } from "@/components/entity-workspace/entity-section";
import { EntityStatus } from "@/components/entity-workspace/entity-status";
import { EntityTableSection } from "@/components/entity-workspace/entity-table-section";
import { EntityTitle } from "@/components/entity-workspace/entity-title";
import { HrWorkspace } from "@/components/entity-workspace/templates/category-workspaces";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import {
  fetchEligiblePayrollLineIds,
  useHrPayrollRun,
  usePayPayrollLine,
  useProcessPayrollRun,
  useUpdatePayrollRun,
} from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { formatDisplayDate, formatDisplayDateRange, formatDisplayDateTime } from "@/lib/date";
import { selectClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HR_PERMISSIONS } from "@ierp/shared";
import type { ColumnDef } from "@tanstack/react-table";
import type { HrPayrollLine, PayrollStatus } from "@ierp/shared";
import type { BadgeProps } from "@/components/ui/badge";
import {
  formatPayrollMoney,
  hasValidPayrollNetPay,
  requirePayrollNetTotal,
} from "@/lib/hr/payroll-money";

const PayPayrollDialog = dynamic(
  () =>
    import("@/components/hr/pay-payroll-dialog").then((m) => ({
      default: m.PayPayrollDialog,
    })),
  { ssr: false }
);

const PAYROLL_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "PROCESSED", label: "Processed" },
  { id: "PARTIALLY_PAID", label: "Partially Paid" },
  { id: "PAID", label: "Paid" },
];

const PAGE_SIZE = 20;

function payrollStatusVariant(status: PayrollStatus): BadgeProps["variant"] {
  switch (status) {
    case "PROCESSED":
    case "PARTIALLY_PAID":
    case "PAID":
      return "success";
    case "CANCELLED":
      return "destructive";
    case "DRAFT":
      return "secondary";
    default:
      return transactionStatusVariant(status);
  }
}

function workflowStatus(status: PayrollStatus): string {
  if (status === "PAID") return "PAID";
  if (status === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (status === "PROCESSED") return "PROCESSED";
  return "DRAFT";
}

function isEligibleUnpaidLine(line: HrPayrollLine) {
  return (
    line.paymentStatus === "UNPAID" &&
    line.status === "PROCESSED" &&
    hasValidPayrollNetPay(line.netPay)
  );
}

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const { data: run, loading, error, refetch } = useHrPayrollRun(id);
  const processMutation = useProcessPayrollRun();
  const updateMutation = useUpdatePayrollRun();
  const payLineMutation = usePayPayrollLine();
  const [pendingAction, setPendingAction] = useState(false);
  const [payingLineId, setPayingLineId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayrollPayDialogMode>("allRemaining");
  const [payDepartmentId, setPayDepartmentId] = useState("");
  const [payEmployeeIds, setPayEmployeeIds] = useState<string[]>([]);
  const [payLineIds, setPayLineIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "UNPAID" | "PAID">("all");
  const [page, setPage] = useState(1);
  const [selectAllPending, setSelectAllPending] = useState(false);

  const isPayableRun = Boolean(
    run && (run.status === "PROCESSED" || run.status === "PARTIALLY_PAID")
  );
  /** Selection enabled from line eligibility + write permission — not paymentSummary gate. */
  const canSelectLines = Boolean(canWrite && isPayableRun);
  const canEditNotes = Boolean(run && canWrite && run.status === "DRAFT");
  const canProcess = Boolean(run && canWrite && run.status === "DRAFT");
  const canPay = Boolean(
    canSelectLines &&
      (run?.lines.some(isEligibleUnpaidLine) || (run?.paymentSummary?.unpaidEmployees ?? 0) > 0)
  );

  const notesLockedReason = !run
    ? undefined
    : run.status === "DRAFT"
      ? canWrite
        ? undefined
        : t("hr.payrollNotesNeedWrite", "You need HR write permission to edit notes.")
      : run.status === "PROCESSED" || run.status === "PARTIALLY_PAID"
        ? t(
            "hr.payrollNotesLockedProcessed",
            "Notes are locked after the payroll run is processed."
          )
        : run.status === "PAID"
          ? t("hr.payrollNotesLockedPaid", "Notes are locked after the payroll run is paid.")
          : t(
              "hr.payrollNotesLockedStatus",
              "Notes can only be edited while this payroll run is a draft."
            );

  const departments = useMemo(() => {
    if (!run) return [];
    const map = new Map<string, string>();
    for (const line of run.lines) {
      map.set(line.employee.departmentId, line.employee.department);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [run]);

  const filteredLines = useMemo(() => {
    if (!run) return [];
    return run.lines.filter((line) => {
      if (departmentFilter && line.employee.departmentId !== departmentFilter) return false;
      if (paymentFilter !== "all" && line.paymentStatus !== paymentFilter) return false;
      return true;
    });
  }, [run, departmentFilter, paymentFilter]);

  const eligibleFilteredLines = useMemo(
    () => filteredLines.filter(isEligibleUnpaidLine),
    [filteredLines]
  );

  const eligibleFilteredIds = useMemo(
    () => eligibleFilteredLines.map((l) => l.id),
    [eligibleFilteredLines]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLines.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLines.slice(start, start + PAGE_SIZE);
  }, [filteredLines, safePage]);

  const eligiblePageLines = useMemo(
    () => pageRows.filter(isEligibleUnpaidLine),
    [pageRows]
  );

  /** Prune selection to IDs that still match current filters + remain unpaid. */
  useEffect(() => {
    const allowed = new Set(eligibleFilteredIds);
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [eligibleFilteredIds]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter, paymentFilter]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const selectedFilteredLines = useMemo(() => {
    if (!run) return [];
    return run.lines.filter((l) => selectedIds.has(l.id) && isEligibleUnpaidLine(l));
  }, [run, selectedIds]);

  const selectedOnPageCount = useMemo(
    () => eligiblePageLines.filter((l) => selectedIds.has(l.id)).length,
    [eligiblePageLines, selectedIds]
  );

  const selectedDepartmentsCount = useMemo(() => {
    const depts = new Set(selectedFilteredLines.map((l) => l.employee.departmentId));
    return depts.size;
  }, [selectedFilteredLines]);

  const selectedNetTotal = useMemo(() => {
    const result = requirePayrollNetTotal(selectedFilteredLines.map((l) => l.netPay));
    return result;
  }, [selectedFilteredLines]);

  const selectedNetDisplay =
    selectedNetTotal.ok ? selectedNetTotal.formatted : t("hr.invalidNetPay", "Invalid amount");

  const allEligibleFilteredSelected =
    eligibleFilteredLines.length > 0 &&
    eligibleFilteredLines.every((l) => selectedIds.has(l.id));
  const someEligibleFilteredSelected =
    eligibleFilteredLines.some((l) => selectedIds.has(l.id)) && !allEligibleFilteredSelected;

  const summary = run?.paymentSummary;
  const progressPct = summary
    ? summary.totalEmployees === 0
      ? 0
      : Math.round((summary.paidEmployees / summary.totalEmployees) * 100)
    : 0;

  const setLineSelected = useCallback((lineId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }, []);

  function togglePageSelection(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const line of eligiblePageLines) {
        if (checked) next.add(line.id);
        else next.delete(line.id);
      }
      return next;
    });
  }

  async function selectAllFiltered() {
    if (!canSelectLines || selectAllPending) return;
    setSelectAllPending(true);
    setActionError(null);
    try {
      const { lineIds } = await fetchEligiblePayrollLineIds(id, {
        departmentId: departmentFilter || undefined,
        paymentStatus: paymentFilter === "all" ? "UNPAID" : paymentFilter,
      });
      // Intersect with current client filter eligibility (payment PAID filter → empty).
      const allowed = new Set(eligibleFilteredIds);
      const next = new Set<string>();
      for (const lineId of lineIds) {
        if (allowed.has(lineId)) next.add(lineId);
      }
      // Prefer client eligible set when API returns subset/stale empty but client has rows.
      if (next.size === 0 && eligibleFilteredIds.length > 0 && paymentFilter !== "PAID") {
        for (const lineId of eligibleFilteredIds) next.add(lineId);
      }
      setSelectedIds(next);
      if (next.size === 0) {
        setActionError(t("hr.payrollNoUnpaidSelected", "No unpaid lines selected"));
      }
    } catch (err) {
      // Fallback: select from in-memory filtered eligible rows.
      setSelectedIds(new Set(eligibleFilteredIds));
      if (eligibleFilteredIds.length === 0) {
        setActionError(mapTransactionUiError(err, t("form.submitFailed")));
      }
    } finally {
      setSelectAllPending(false);
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openEditDialog() {
    if (!run || !canEditNotes) return;
    setEditNotes(run.notes ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }

  function openPayDialog(opts?: {
    mode?: PayrollPayDialogMode;
    departmentId?: string;
    employeeIds?: string[];
    lineIds?: string[];
  }) {
    setPayMode(opts?.mode ?? "allRemaining");
    setPayDepartmentId(opts?.departmentId ?? "");
    setPayEmployeeIds(opts?.employeeIds ?? []);
    setPayLineIds(opts?.lineIds ?? []);
    setPayOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!run || !canEditNotes || editSubmitting) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const notes = editNotes.trim() ? editNotes.trim() : null;
      await updateMutation.mutateAsync({ id, input: { notes } });
      setEditOpen(false);
      setActionSuccess(t("masterData.saved"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleProcess() {
    if (processMutation.isPending) return;
    setPendingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await processMutation.mutateAsync({ id });
      setActionSuccess(t("hr.payrollProcessed"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPendingAction(false);
    }
  }

  async function handlePayLine(line: HrPayrollLine) {
    if (payLineMutation.isPending || payingLineId) return;
    if (!isEligibleUnpaidLine(line)) return;
    setPayingLineId(line.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      await payLineMutation.mutateAsync({ id, lineId: line.id });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(line.id);
        return next;
      });
      setActionSuccess(t("hr.payrollPaymentSuccess", "Payroll payment recorded successfully."));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPayingLineId(null);
    }
  }

  const lineColumns: ColumnDef<HrPayrollLine>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => {
          const pageEligible = eligiblePageLines.length;
          const pageAllSelected =
            pageEligible > 0 && eligiblePageLines.every((l) => selectedIds.has(l.id));
          const pageSomeSelected =
            eligiblePageLines.some((l) => selectedIds.has(l.id)) && !pageAllSelected;
          return (
            <SelectionCheckbox
              aria-label={t("hr.selectAllOnPage", "Select all on page")}
              checked={pageAllSelected}
              indeterminate={pageSomeSelected}
              disabled={!canSelectLines || pageEligible === 0}
              onCheckedChange={(checked) => togglePageSelection(checked)}
            />
          );
        },
        cell: ({ row }) => {
          const line = row.original;
          const eligible = isEligibleUnpaidLine(line);
          const disabled = !canSelectLines || !eligible;
          return (
            <SelectionCheckbox
              aria-label={t("hr.selectEmployee", "Select employee")}
              checked={selectedIds.has(line.id)}
              disabled={disabled}
              onCheckedChange={(checked) => {
                if (disabled) return;
                setLineSelected(line.id, checked);
              }}
            />
          );
        },
      },
      {
        id: "employee",
        header: t("hr.employee"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/hr/employees/${row.original.employee.id}`}
            className="cursor-pointer hover:opacity-90"
          >
            <EmployeePersonChip
              employee={{
                id: row.original.employee.id,
                fullName: row.original.employee.fullName,
                employeeNumber: row.original.employee.employeeNumber,
                hasAvatar: row.original.employee.hasAvatar,
              }}
              showPresence={false}
            />
          </Link>
        ),
      },
      {
        accessorKey: "employee.department",
        header: t("masterData.department"),
        cell: ({ row }) => row.original.employee.department,
      },
      {
        accessorKey: "netPay",
        header: t("hr.netPay"),
        cell: ({ row }) => (
          <span className="ew-ltr-isolate font-semibold tabular-nums text-[var(--success)]">
            {formatPayrollMoney(row.original.netPay)}
          </span>
        ),
      },
      {
        id: "paymentStatus",
        header: t("hr.paymentStatus", "Payment"),
        cell: ({ row }) => {
          const paid = row.original.paymentStatus === "PAID";
          return (
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                paid
                  ? "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]"
                  : "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]"
              )}
            >
              {paid ? t("hr.paid", "Paid") : t("hr.unpaid", "Unpaid")}
            </span>
          );
        },
      },
      {
        id: "paidAt",
        header: t("hr.paidAt", "Paid at"),
        cell: ({ row }) =>
          row.original.paidAt ? (
            <span className="ew-ltr-isolate text-xs tabular-nums">
              {formatDisplayDateTime(row.original.paidAt, locale)}
            </span>
          ) : row.original.paymentStatus === "PAID" ? (
            <span className="text-xs text-[var(--muted)]">
              {t("hr.notRecorded", "Not recorded")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const line = row.original;
          if (!canPay || !isEligibleUnpaidLine(line)) return null;
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              data-row-click-ignore
              disabled={Boolean(payingLineId) || payLineMutation.isPending}
              loading={payingLineId === line.id}
              onClick={(e) => {
                e.stopPropagation();
                void handlePayLine(line);
              }}
            >
              {t("hr.payEmployee", "Pay employee")}
            </Button>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use functional state updates
    [
      canSelectLines,
      canPay,
      eligiblePageLines,
      selectedIds,
      payingLineId,
      payLineMutation.isPending,
      setLineSelected,
      t,
      locale,
    ]
  );

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !run) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="payroll_run"
          entityId={id}
          error={error ?? t("hr.payrollNotFound", "Payroll run not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const headerActions: EntityAction[] = [];
  if (canEditNotes) {
    headerActions.push({
      id: "edit",
      label: t("hr.editPayroll", "Edit payroll"),
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
      kind: "primary",
      capability: "edit",
      onSelect: openEditDialog,
    });
  }
  if (canProcess) {
    headerActions.push({
      id: "process",
      label: t("hr.processPayroll"),
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
      kind: canEditNotes ? "secondary" : "primary",
      capability: "transition",
      pending: pendingAction,
      confirm: "soft",
      confirmTitle: t("hr.processPayroll"),
      confirmDescription: t("hr.processPayrollConfirm"),
      onSelect: () => void handleProcess(),
    });
  }
  if (canPay) {
    headerActions.push({
      id: "pay",
      label: t("hr.payPayroll", "Pay payroll"),
      icon: <Wallet className="h-3.5 w-3.5" aria-hidden />,
      kind: "primary",
      capability: "transition",
      onSelect: () => openPayDialog({ mode: "allRemaining" }),
    });
  }

  const workflowSteps =
    run.status === "CANCELLED"
      ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
      : buildLinearWorkflowSteps(PAYROLL_WORKFLOW, workflowStatus(run.status));

  const capabilities: Array<"edit" | "transition"> = [];
  if (canWrite) {
    capabilities.push("edit", "transition");
  }

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/payroll">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("hr.backToPayroll", "Back to payroll")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <HrNavLinks />

      <HrWorkspace
        entityType="payroll_run"
        entityId={run.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("hr.payrollTitle"), href: "/dashboard/hr/payroll" },
              { label: run.runNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{run.runNumber}</span>}
                  subtitle={
                    <span className="ew-ltr-isolate">
                      {formatDisplayDateRange(run.periodStart, run.periodEnd, locale)}
                    </span>
                  }
                  trailing={
                    <EntityStatus
                      label={t(`hr.payrollStatus.${run.status}`, statusLabel(run.status))}
                      variant={payrollStatusVariant(run.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar actions={headerActions} capabilities={capabilities} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "gross",
                label: t("hr.grossTotal"),
                value: (
                  <span className="ew-ltr-isolate">{formatPayrollMoney(run.grossTotal)}</span>
                ),
              },
              {
                id: "deductions",
                label: t("hr.deductionsTotal"),
                value: (
                  <span className="ew-ltr-isolate">{formatPayrollMoney(run.deductionsTotal)}</span>
                ),
              },
              {
                id: "net",
                label: t("hr.netTotal"),
                value: <span className="ew-ltr-isolate">{formatPayrollMoney(run.netTotal)}</span>,
              },
              {
                id: "lines",
                label: t("hr.lineCount", "Lines"),
                value: String(run.lines.length),
              },
            ]}
          />
        }
        main={
          <>
            {run.status !== "DRAFT" && summary ? (
              <EntitySection
                id="payment-progress"
                title={t("hr.paymentProgress", "Payment progress")}
                defaultOpen
              >
                <div className="space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-[width] duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="text-sm">
                      <p className="text-xs text-[var(--muted)]">
                        {t("hr.employeesPaid", "Employees paid")}
                      </p>
                      <p className="font-semibold">
                        {summary.paidEmployees} / {summary.totalEmployees}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-[var(--muted)]">
                        {t("hr.employeesRemaining", "Employees remaining")}
                      </p>
                      <p className="font-semibold">{summary.unpaidEmployees}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-[var(--muted)]">
                        {t("hr.departmentsCompleted", "Departments completed")}
                      </p>
                      <p className="font-semibold">
                        {summary.departmentsCompleted} / {summary.departmentsTotal}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-[var(--muted)]">{t("hr.paidAmount", "Paid amount")}</p>
                      <p className="ew-ltr-isolate font-semibold tabular-nums">
                        {formatPayrollMoney(summary.paidAmount)}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-[var(--muted)]">
                        {t("hr.unpaidAmount", "Unpaid amount")}
                      </p>
                      <p className="ew-ltr-isolate font-semibold tabular-nums">
                        {formatPayrollMoney(summary.unpaidAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </EntitySection>
            ) : null}

            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "period-start",
                    label: t("hr.startDate"),
                    value: formatDisplayDate(run.periodStart, locale),
                    mono: true,
                  },
                  {
                    id: "period-end",
                    label: t("hr.endDate"),
                    value: formatDisplayDate(run.periodEnd, locale),
                    mono: true,
                  },
                  {
                    id: "processed",
                    label: t("hr.processedAt", "Processed"),
                    value: run.processedAt
                      ? formatDisplayDateTime(run.processedAt, locale)
                      : "—",
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <EntityTableSection id="lines" title={t("hr.payrollLines", "Payroll lines")}>
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
                <select
                  aria-label={t("masterData.department")}
                  className={cn(selectClassName, "min-w-[10rem]")}
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="">{t("hr.allDepartments", "All departments")}</option>
                  {departments.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("hr.paymentStatus", "Payment")}
                  className={cn(selectClassName, "min-w-[9rem]")}
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
                >
                  <option value="all">{t("hr.allPaymentStatuses", "All payment statuses")}</option>
                  <option value="UNPAID">{t("hr.unpaid", "Unpaid")}</option>
                  <option value="PAID">{t("hr.paid", "Paid")}</option>
                </select>
                {canSelectLines ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      loading={selectAllPending}
                      disabled={
                        selectAllPending ||
                        eligibleFilteredLines.length === 0 ||
                        allEligibleFilteredSelected
                      }
                      onClick={() => void selectAllFiltered()}
                    >
                      {t("hr.selectAllFiltered", "Select all filtered")}
                    </Button>
                    <SelectionCheckbox
                      aria-label={t("hr.selectAllFiltered", "Select all filtered")}
                      checked={allEligibleFilteredSelected}
                      indeterminate={someEligibleFilteredSelected}
                      disabled={eligibleFilteredLines.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) void selectAllFiltered();
                        else clearSelection();
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer gap-1.5"
                      onClick={() => openPayDialog({ mode: "department" })}
                    >
                      <Banknote className="h-3.5 w-3.5" aria-hidden />
                      {t("hr.payDepartment", "Pay department")}
                    </Button>
                  </>
                ) : null}
              </div>

              {selectedFilteredLines.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--accent)]/5 px-3 py-2 text-sm">
                  <span className="space-x-2 rtl:space-x-reverse">
                    <span>
                      {t("hr.selectedEmployees", "Selected employees")}:{" "}
                      <strong>{selectedFilteredLines.length}</strong>
                      <span className="text-[var(--muted)]">
                        {" "}
                        ({selectedOnPageCount} {t("hr.onThisPage", "on this page")})
                      </span>
                    </span>
                    <span>
                      {t("hr.selectedDepartments", "Departments")}:{" "}
                      <strong>{selectedDepartmentsCount}</strong>
                    </span>
                    <span>
                      {t("hr.selectedNetPay", "Selected net pay")}:{" "}
                      <strong
                        className={cn(
                          "ew-ltr-isolate tabular-nums",
                          !selectedNetTotal.ok && "text-[var(--destructive)]"
                        )}
                      >
                        {selectedNetDisplay}
                      </strong>
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={clearSelection}
                    >
                      {t("hr.clearSelection", "Clear selection")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="cursor-pointer"
                      disabled={!selectedNetTotal.ok}
                      onClick={() => {
                        if (!selectedNetTotal.ok) {
                          setActionError(selectedNetTotal.message);
                          return;
                        }
                        openPayDialog({
                          mode: "lines",
                          lineIds: selectedFilteredLines.map((l) => l.id),
                        });
                      }}
                    >
                      {t("hr.paySelected", "Pay selected")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {filteredLines.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable
                  columns={lineColumns}
                  data={pageRows}
                  pageSize={PAGE_SIZE}
                  paginationPosition="inline"
                  serverPagination={{
                    page: safePage,
                    totalPages,
                    totalItems: filteredLines.length,
                    pageSize: PAGE_SIZE,
                    onPageChange: setPage,
                  }}
                />
              )}
            </EntityTableSection>

            <EntityNotesEditor
              value={run.notes}
              canEdit={canEditNotes}
              disabledReason={notesLockedReason}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
              }}
            />

            <EntityAudit
              meta={{
                id: run.id,
                updatedAt: run.processedAt
                  ? formatDisplayDateTime(run.processedAt, locale)
                  : undefined,
                updatedBy: run.processedBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={t(`hr.payrollStatus.${run.status}`, statusLabel(run.status))}
              steps={workflowSteps}
              defaultOpen
            />
            {run.processedBy ? (
              <EntityOwner
                name={run.processedBy.name}
                role={t("hr.processedBy", "Processed by")}
                userId={run.processedBy.id}
                defaultOpen
              />
            ) : null}
            {run.status !== "DRAFT" ? (
              <EntitySection id="status-note" title={t("hr.payrollRun")} defaultOpen>
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("hr.payrollImmutableTitle", "Payroll is locked")}
                  description={
                    run.status === "PROCESSED" ||
                    run.status === "PARTIALLY_PAID" ||
                    run.status === "PAID"
                      ? t(
                          "hr.payrollImmutableProcessed",
                          "Totals, employee lines, and notes cannot be changed after processing. Payments can still be recorded for unpaid employees."
                        )
                      : t(
                          "hr.payrollImmutableCancelled",
                          "Cancelled payroll runs cannot be edited."
                        )
                  }
                />
              </EntitySection>
            ) : !canWrite ? (
              <EntitySection id="status-note" title={t("hr.payrollRun")} defaultOpen>
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("action.currentStatus") + `: ${statusLabel(run.status)}`}
                  description={t(
                    "hr.payrollNotesNeedWrite",
                    "You need HR write permission to edit notes."
                  )}
                />
              </EntitySection>
            ) : null}
          </>
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("hr.editPayroll", "Edit payroll")} —{" "}
              <span className="ew-ltr-isolate">{run.runNumber}</span>
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <p className="text-xs text-[var(--muted)]">
              {t(
                "hr.payrollEditHint",
                "Only notes can be changed while this run is a draft. Totals and lines update when you process payroll."
              )}
            </p>
            <FormField label={t("hr.notes")}>
              <textarea
                className={textareaClassName}
                rows={5}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSubmitting}
                placeholder={t("masterData.notesPlaceholder")}
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

      {payOpen ? (
        <PayPayrollDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          run={run}
          initialMode={payMode}
          initialDepartmentId={payDepartmentId}
          initialEmployeeIds={payEmployeeIds}
          initialLineIds={payLineIds}
          onSuccess={(message) => {
            setActionSuccess(message);
            setSelectedIds(new Set());
          }}
        />
      ) : null}
    </ModuleLayout>
  );
}
