"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DataTable } from "@/components/data-display/data-table";
import { leaveRequestColumns } from "@/components/hr/hr-columns";
import {
  AttendanceStatusBadge,
  ContractStatusBadge,
  DocumentStatusBadge,
} from "@/components/hr/hr-status-badge";
import {
  EntityEmptyState,
  EntitySection,
  EntityTableSection,
} from "@/components/entity-workspace";
import { formatDisplayDate } from "@/lib/date";
import { formatPayrollMoney } from "@/lib/hr/payroll-money";
import { useI18n } from "@/lib/i18n";
import type { HrEmployeeDetail } from "@ierp/shared";

export function EmployeeHrSnapshot({ employee }: { employee: HrEmployeeDetail }) {
  const { locale, t } = useI18n();
  const contract = employee.activeContract;
  const payroll = employee.latestPayrollLine;

  return (
    <>
      <EntitySection id="attendance" title={t("masterData.attendanceSnapshot")} defaultOpen>
        <div className="mb-3 flex justify-end">
          <Link
            href="/dashboard/hr/attendance"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {t("hr.viewAttendance", "View attendance")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {employee.attendanceSnapshot.length === 0 ? (
          <EntityEmptyState variant="empty" density="compact" title={t("masterData.noAttendance")} />
        ) : (
          <ul className="space-y-2">
            {employee.attendanceSnapshot.map((a) => (
              <li
                key={a.date}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
              >
                <span className="ew-ltr-isolate text-sm tabular-nums">
                  {formatDisplayDate(a.date, locale)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="ew-ltr-isolate text-xs tabular-nums text-[var(--muted)]">
                    {a.checkIn ?? "—"} – {a.checkOut ?? "—"}
                  </span>
                  <AttendanceStatusBadge status={a.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </EntitySection>

      <EntityTableSection id="leave" title={t("masterData.recentLeave")}>
        <div className="flex items-center justify-end border-b border-[var(--border-subtle)] px-4 py-2">
          <Link
            href="/dashboard/hr/leave-requests"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {t("hr.viewLeave", "View leave requests")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {employee.recentLeaveRequests.length === 0 ? (
          <div className="p-4">
            <EntityEmptyState variant="empty" density="compact" title={t("common.noData")} />
          </div>
        ) : (
          <DataTable columns={leaveRequestColumns} data={employee.recentLeaveRequests} pageSize={8} />
        )}
      </EntityTableSection>

      <EntitySection id="contract" title={t("hr.activeContract", "Active contract")} defaultOpen>
        {!contract ? (
          <EntityEmptyState
            variant="empty"
            density="compact"
            title={t("hr.noActiveContract", "No active contract")}
          />
        ) : (
          <div className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("hr.contractNumber", "Contract #")}</dt>
                <dd className="ew-ltr-isolate font-mono text-sm">{contract.contractNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("hr.contractType", "Type")}</dt>
                <dd className="text-sm">{contract.contractType.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("common.status")}</dt>
                <dd className="mt-1">
                  <ContractStatusBadge status={contract.status} />
                  {contract.isExpiringSoon ? (
                    <span className="ms-2 text-xs text-[var(--warning)]">
                      {t("hr.expiringSoon", "Expiring soon")}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">{t("hr.contractDates", "Dates")}</dt>
                <dd className="ew-ltr-isolate text-sm">
                  {formatDisplayDate(contract.startDate, locale)}
                  {" → "}
                  {contract.endDate ? formatDisplayDate(contract.endDate, locale) : "—"}
                </dd>
              </div>
              {employee.canViewSalary ? (
                <div>
                  <dt className="text-xs text-[var(--muted)]">{t("masterData.salary")}</dt>
                  <dd className="text-sm">{contract.salary ?? "—"}</dd>
                </div>
              ) : null}
            </dl>
            <Link
              href={`/dashboard/hr/contracts/${contract.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {t("hr.openContract", "Open contract")}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </EntitySection>

      {employee.canViewSalary ? (
        <EntitySection id="payroll" title={t("hr.payrollSummary", "Payroll summary")} defaultOpen>
          {!payroll ? (
            <EntityEmptyState
              variant="empty"
              density="compact"
              title={t("hr.noPayrollLine", "No payroll history yet")}
            />
          ) : (
            <div className="space-y-3">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[var(--muted)]">{t("hr.payrollRun", "Payroll run")}</dt>
                  <dd className="ew-ltr-isolate font-mono text-sm">{payroll.runNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">{t("hr.period", "Period")}</dt>
                  <dd className="ew-ltr-isolate text-sm">
                    {formatDisplayDate(payroll.periodStart, locale)} –{" "}
                    {formatDisplayDate(payroll.periodEnd, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">{t("hr.netPay", "Net pay")}</dt>
                  <dd className="ew-ltr-isolate text-sm font-medium">
                    {formatPayrollMoney(payroll.netPay)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">{t("hr.paymentStatus", "Payment")}</dt>
                  <dd className="text-sm">{payroll.paymentStatus}</dd>
                </div>
              </dl>
              <Link
                href={`/dashboard/hr/payroll/${payroll.payrollRunId}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                {t("hr.openPayrollRun", "Open payroll run")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </EntitySection>
      ) : null}

      <EntitySection id="hr-documents" title={t("hr.employeeDocuments", "Employee documents")} defaultOpen>
        <div className="mb-3 flex justify-end">
          <Link
            href="/dashboard/hr/documents"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            {t("hr.viewDocuments", "View documents")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {employee.recentDocuments.length === 0 ? (
          <EntityEmptyState
            variant="empty"
            density="compact"
            title={t("hr.noEmployeeDocuments", "No employee documents")}
          />
        ) : (
          <ul className="space-y-2">
            {employee.recentDocuments.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/dashboard/hr/documents/${doc.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 transition-colors hover:bg-[var(--muted-bg)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {doc.documentType}
                      {doc.expiryDate
                        ? ` · ${t("hr.expires", "Expires")} ${formatDisplayDate(doc.expiryDate, locale)}`
                        : null}
                    </p>
                  </div>
                  <span className="shrink-0">
                    <DocumentStatusBadge status={doc.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </EntitySection>
    </>
  );
}

export function EmployeeReportingStructure({ employee }: { employee: HrEmployeeDetail }) {
  const { t } = useI18n();

  return (
    <EntitySection id="reporting" title={t("hr.reportingStructure", "Reporting structure")} defaultOpen>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("masterData.manager")}
          </p>
          {employee.manager ? (
            <Link
              href={`/dashboard/hr/employees/${employee.manager.id}`}
              className="mt-1 inline-flex cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {employee.manager.fullName}
            </Link>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">{t("hr.noManager", "No manager")}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("hr.directReports", "Direct reports")}
          </p>
          {employee.directReports.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("hr.noDirectReports", "No direct reports")}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {employee.directReports.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/dashboard/hr/employees/${report.id}`}
                    className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-[var(--muted-bg)]"
                  >
                    <span className="min-w-0 truncate font-medium text-[var(--accent)]">
                      {report.fullName}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {report.positionTitle}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </EntitySection>
  );
}
