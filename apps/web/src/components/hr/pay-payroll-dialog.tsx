"use client";

import { useMemo, useState } from "react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { SelectField } from "@/components/forms/select-field";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/lib/form-utils";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { usePayPayrollRun } from "@/lib/hooks/use-hr";
import { requirePayrollNetTotal } from "@/lib/hr/payroll-money";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { HrPayrollLine, HrPayrollRunDetail, PayPayrollRunInput } from "@ierp/shared";

export type PayrollPayDialogMode = "allRemaining" | "department" | "employees" | "lines";

type PayPayrollDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: HrPayrollRunDetail;
  initialMode?: PayrollPayDialogMode;
  initialDepartmentId?: string;
  initialEmployeeIds?: string[];
  /** When set, payment uses stable payroll-line IDs (preferred for table selection). */
  initialLineIds?: string[];
  onSuccess?: (message: string) => void;
};

export function PayPayrollDialog({
  open,
  onOpenChange,
  run,
  initialMode = "allRemaining",
  initialDepartmentId = "",
  initialEmployeeIds,
  initialLineIds,
  onSuccess,
}: PayPayrollDialogProps) {
  const { t } = useI18n();
  const payMutation = usePayPayrollRun();
  const lockedLineIds = useMemo(
    () => (initialLineIds && initialLineIds.length > 0 ? initialLineIds : null),
    [initialLineIds]
  );
  const [mode, setMode] = useState<PayrollPayDialogMode>(
    lockedLineIds ? "lines" : initialMode === "lines" ? "employees" : initialMode
  );
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialEmployeeIds ?? [])
  );
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unpaidLines = useMemo(
    () => run.lines.filter((l) => l.paymentStatus === "UNPAID" && l.status === "PROCESSED"),
    [run.lines]
  );

  const departmentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; unpaid: number; total: number }>();
    for (const line of run.lines) {
      const id = line.employee.departmentId;
      const entry = map.get(id) ?? {
        id,
        name: line.employee.department,
        unpaid: 0,
        total: 0,
      };
      entry.total += 1;
      if (line.paymentStatus === "UNPAID" && line.status === "PROCESSED") entry.unpaid += 1;
      map.set(id, entry);
    }
    return [...map.values()]
      .filter((d) => d.unpaid > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => ({
        value: d.id,
        label: `${d.name} (${d.unpaid} unpaid)`,
      }));
  }, [run.lines]);

  const visibleEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unpaidLines.filter((line) => {
      if (mode === "department" && departmentId && line.employee.departmentId !== departmentId) {
        return false;
      }
      if (!q) return true;
      return (
        line.employee.fullName.toLowerCase().includes(q) ||
        line.employee.employeeNumber.toLowerCase().includes(q) ||
        line.employee.department.toLowerCase().includes(q)
      );
    });
  }, [unpaidLines, search, mode, departmentId]);

  const selectedLines = useMemo(() => {
    if (lockedLineIds) {
      const idSet = new Set(lockedLineIds);
      return unpaidLines.filter((l) => idSet.has(l.id));
    }
    if (mode === "allRemaining") return unpaidLines;
    if (mode === "department") {
      return unpaidLines.filter((l) => l.employee.departmentId === departmentId);
    }
    return unpaidLines.filter((l) => selectedIds.has(l.employee.id));
  }, [lockedLineIds, mode, unpaidLines, departmentId, selectedIds]);

  const selectedTotal = useMemo(
    () => requirePayrollNetTotal(selectedLines.map((l) => l.netPay)),
    [selectedLines]
  );

  const busy = submitting || payMutation.isPending;

  function resetState(nextMode: PayrollPayDialogMode = initialMode) {
    setMode(nextMode);
    setDepartmentId(initialDepartmentId);
    setSearch("");
    setSelectedIds(new Set(initialEmployeeIds ?? []));
    setConfirming(false);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!shouldAllowEditDialogClose(busy, next)) return;
    onOpenChange(next);
    if (!next) resetState(initialMode);
    else resetState(initialMode);
  }

  function toggleEmployee(employeeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const line of visibleEmployees) next.add(line.employee.id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleConfirmPay() {
    if (busy || selectedLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: PayPayrollRunInput = lockedLineIds
        ? { mode: "lines", lineIds: selectedLines.map((l) => l.id) }
        : mode === "allRemaining"
          ? { mode: "allRemaining" }
          : mode === "department"
            ? { mode: "department", departmentId }
            : {
                mode: "employees",
                employeeIds: selectedLines.map((l) => l.employee.id),
              };

      await payMutation.mutateAsync({
        id: run.id,
        input,
        lineIds: selectedLines.map((l) => l.id),
      });
      onOpenChange(false);
      resetState();
      onSuccess?.(
        t("hr.payrollPaymentSuccess", "Payroll payment recorded successfully.")
      );
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrimary() {
    if (selectedLines.length === 0) {
      setError(t("hr.payrollNoUnpaidSelected", "No unpaid lines selected"));
      return;
    }
    if (!selectedTotal.ok) {
      setError(selectedTotal.message);
      return;
    }
    if (!lockedLineIds && mode === "department" && !departmentId) {
      setError(t("hr.payrollSelectDepartment", "Select a department"));
      return;
    }
    if (!confirming) {
      setConfirming(true);
      setError(null);
      return;
    }
    void handleConfirmPay();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("hr.payPayroll", "Pay payroll")} —{" "}
            <span className="ew-ltr-isolate">{run.runNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handlePrimary();
          }}
        >
          <ActionFeedback error={error} />

          {lockedLineIds ? (
            <p className="text-sm text-[var(--muted)]">
              {t(
                "hr.paySelectedLinesHint",
                "Paying the employees currently selected in the payroll table."
              )}
            </p>
          ) : (
            <SelectField
              id="payroll-pay-mode"
              label={t("hr.paymentMode", "Payment mode")}
              value={mode === "lines" ? "employees" : mode}
              onChange={(v) => {
                setMode(v as PayrollPayDialogMode);
                setConfirming(false);
                setError(null);
              }}
              options={[
                {
                  value: "allRemaining",
                  label: t("hr.payAllRemaining", "Pay all remaining"),
                },
                {
                  value: "department",
                  label: t("hr.payDepartment", "Pay department"),
                },
                {
                  value: "employees",
                  label: t("hr.paySelectedEmployees", "Pay selected employees"),
                },
              ]}
              disabled={busy || confirming}
            />
          )}

          {!lockedLineIds && mode === "department" ? (
            <SelectField
              id="payroll-pay-department"
              label={t("masterData.department")}
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v);
                setConfirming(false);
              }}
              options={[
                { value: "", label: t("hr.selectDepartment", "Select department…") },
                ...departmentOptions,
              ]}
              disabled={busy || confirming}
            />
          ) : null}

          {!lockedLineIds && (mode === "employees" || mode === "department") ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="payroll-pay-search">
                {t("common.search", "Search")}
              </label>
              <input
                id="payroll-pay-search"
                className={inputClassName}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("hr.searchEmployees", "Search employees…")}
                disabled={busy || confirming}
              />
              {mode === "employees" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={selectAllVisible}
                    disabled={busy || confirming || visibleEmployees.length === 0}
                  >
                    {t("hr.selectAllVisible", "Select all visible")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={clearSelection}
                    disabled={busy || confirming || selectedIds.size === 0}
                  >
                    {t("hr.clearSelection", "Clear selection")}
                  </Button>
                </div>
              ) : null}
              <div className="max-h-56 overflow-y-auto rounded-md border border-[var(--border)]">
                {visibleEmployees.length === 0 ? (
                  <p className="p-3 text-sm text-[var(--muted)]">
                    {t("hr.noUnpaidEmployees", "No unpaid employees match.")}
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {visibleEmployees.map((line) => {
                      const checked =
                        mode === "department"
                          ? Boolean(departmentId) && line.employee.departmentId === departmentId
                          : selectedIds.has(line.employee.id);
                      return (
                        <li key={line.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                              mode === "department" && "cursor-default"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[var(--accent)]"
                              checked={checked}
                              disabled={busy || confirming || mode === "department"}
                              onChange={() => toggleEmployee(line.employee.id)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{line.employee.fullName}</span>
                              <span className="block text-xs text-[var(--muted)]">
                                {line.employee.department} ·{" "}
                                <span className="ew-ltr-isolate">{line.employee.employeeNumber}</span>
                              </span>
                            </span>
                            <span className="ew-ltr-isolate tabular-nums font-medium">
                              {line.netPay}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-[var(--border)] bg-[var(--muted-bg)]/40 px-3 py-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                {t("hr.selectedEmployees", "Selected employees")}:{" "}
                <strong>{selectedLines.length}</strong>
              </span>
              <span>
                {t("hr.selectedNetPay", "Selected net pay")}:{" "}
                <strong
                  className={cn(
                    "ew-ltr-isolate tabular-nums",
                    !selectedTotal.ok && "text-[var(--destructive)]"
                  )}
                >
                  {selectedTotal.ok
                    ? selectedTotal.formatted
                    : t("hr.invalidNetPay", "Invalid amount")}
                </strong>
              </span>
            </div>
            {confirming ? (
              <p className="mt-2 text-xs text-[var(--warning)]">
                {t(
                  "hr.confirmPayrollPayment",
                  "Confirm payment? This posts a journal entry and cannot be undone from here."
                )}
              </p>
            ) : null}
          </div>

          <FormActions
            cancelLabel={confirming ? t("form.back", "Back") : t("form.cancel")}
            submitLabel={
              confirming
                ? t("hr.confirmPay", "Confirm pay")
                : t("hr.payPayroll", "Pay payroll")
            }
            loading={busy}
            disabled={busy || selectedLines.length === 0 || !selectedTotal.ok}
            onCancel={() => {
              if (confirming) {
                setConfirming(false);
                return;
              }
              handleOpenChange(false);
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function unpaidPayrollLines(lines: HrPayrollLine[]) {
  return lines.filter((l) => l.paymentStatus === "UNPAID" && l.status === "PROCESSED");
}
