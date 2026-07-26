"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { HrAttendanceRecord, HrContract, HrDocument, HrEmployee, HrLeaveRequest, HrPayrollRun, HrPosition } from "@ierp/shared";
import { MasterDataLifecycleBadge } from "@/components/data-display/master-data-lifecycle-badge";
import { EmployeePersonChip, UserPersonChip } from "@/components/avatar/person-chips";
import {
  AttendanceStatusBadge,
  ContractStatusBadge,
  ContractTypeLabel,
  DocumentStatusBadge,
  EMPLOYMENT_STATUS_LABELS,
  EmploymentStatusBadge,
  ExpiryWarningBadge,
  LEAVE_TYPE_LABELS,
  LeaveStatusBadge,
  PayrollStatusBadge,
} from "@/components/hr/hr-status-badge";
import { formatDisplayDate, formatDisplayDateRange, formatDisplayDateTime } from "@/lib/date";
import { getDocumentExpiryWarningLabel } from "@/lib/hr/document-expiry";
import { formatPayrollMoney } from "@/lib/hr/payroll-money";
import { useI18n } from "@/lib/i18n";

function DisplayDate({ value }: { value: string | null | undefined }) {
  const { locale } = useI18n();
  return <>{formatDisplayDate(value, locale)}</>;
}

function DisplayDateRange({ start, end }: { start: string | null | undefined; end: string | null | undefined }) {
  const { locale } = useI18n();
  return <>{formatDisplayDateRange(start, end, locale)}</>;
}

function DisplayDateTime({ value }: { value: string | null | undefined }) {
  const { locale } = useI18n();
  return <>{formatDisplayDateTime(value, locale)}</>;
}

export const employeeColumns: ColumnDef<HrEmployee>[] = [
  {
    accessorKey: "employeeNumber",
    header: "Employee #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/hr/employees/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.employeeNumber}
      </Link>
    ),
  },
  {
    accessorKey: "fullName",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/hr/employees/${row.original.id}`}
        className="cursor-pointer hover:opacity-90"
      >
        <EmployeePersonChip employee={row.original} />
      </Link>
    ),
  },
  {
    id: "department",
    header: "Department",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.department.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.department.code}</p>
      </div>
    ),
  },
  {
    id: "position",
    header: "Position",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.position.title}</span>
    ),
  },
  {
    accessorKey: "employmentStatus",
    header: "Employment",
    cell: ({ row }) => <EmploymentStatusBadge status={row.original.employmentStatus} />,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <MasterDataLifecycleBadge state={row.original.isActive ? "active" : "inactive"} />
    ),
  },
  { accessorKey: "workLocation", header: "Location" },
  {
    accessorKey: "hireDate",
    header: "Hire date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums"><DisplayDate value={row.original.hireDate} /></span>
    ),
  },
];

export const attendanceColumns: ColumnDef<HrAttendanceRecord>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium tabular-nums"><DisplayDate value={row.original.date} /></span>
    ),
  },
  {
    id: "employee",
    header: "Employee",
    cell: ({ row }) => (
      <EmployeePersonChip
        employee={{
          id: row.original.employee.id,
          fullName: row.original.employee.fullName,
          employeeNumber: row.original.employee.employeeNumber,
          hasAvatar: row.original.employee.hasAvatar,
        }}
        showPresence={false}
      />
    ),
  },
  {
    id: "department",
    header: "Department",
    cell: ({ row }) => <span className="text-sm">{row.original.employee.department}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <AttendanceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "checkIn",
    header: "Check in",
    cell: ({ row }) => <span className="tabular-nums">{row.original.checkIn ?? "—"}</span>,
  },
  {
    accessorKey: "checkOut",
    header: "Check out",
    cell: ({ row }) => <span className="tabular-nums">{row.original.checkOut ?? "—"}</span>,
  },
  { accessorKey: "employee.workLocation", header: "Location", cell: ({ row }) => row.original.employee.workLocation },
];

export const leaveRequestColumns: ColumnDef<HrLeaveRequest>[] = [
  {
    id: "employee",
    header: "Employee",
    cell: ({ row }) => (
      <EmployeePersonChip
        employee={{
          id: row.original.employee.id,
          fullName: row.original.employee.fullName,
          employeeNumber: row.original.employee.employeeNumber,
          hasAvatar: row.original.employee.hasAvatar,
        }}
        showPresence={false}
      />
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm">{LEAVE_TYPE_LABELS[row.original.type]}</span>
    ),
  },
  {
    id: "dates",
    header: "Date range",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        <DisplayDateRange start={row.original.startDate} end={row.original.endDate} />
      </span>
    ),
  },
  {
    accessorKey: "days",
    header: "Days",
    cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.days}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <LeaveStatusBadge status={row.original.status} />,
  },
  {
    id: "decision",
    header: "Approver",
    cell: ({ row }) => {
      const leave = row.original;
      if (leave.status === "PENDING") {
        if (!leave.assignedApprover) {
          return <span className="text-sm text-[var(--muted)]">—</span>;
        }
        return (
          <EmployeePersonChip
            employee={{
              id: leave.assignedApprover.id,
              fullName: leave.assignedApprover.fullName,
              hasAvatar: leave.assignedApprover.hasAvatar,
            }}
            showPresence={false}
          />
        );
      }
      if (!leave.decidedBy && !leave.approvedBy) {
        return <span className="text-sm text-[var(--muted)]">—</span>;
      }
      const actor = leave.decidedBy
        ? { id: leave.decidedBy.id, name: leave.decidedBy.name }
        : leave.approvedBy
          ? { id: leave.approvedBy.id, name: leave.approvedBy.fullName }
          : null;
      if (!actor) return <span className="text-sm text-[var(--muted)]">—</span>;
      return (
        <UserPersonChip
          user={{
            id: actor.id,
            name: actor.name,
          }}
        />
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[200px] text-sm text-[var(--muted)]">
        {row.original.reason ?? "—"}
      </span>
    ),
  },
];

export { EMPLOYMENT_STATUS_LABELS };

export const payrollRunColumns: ColumnDef<HrPayrollRun>[] = [
  {
    accessorKey: "runNumber",
    header: "Run #",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold text-[var(--accent)]">{row.original.runNumber}</span>
    ),
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        <DisplayDateRange start={row.original.periodStart} end={row.original.periodEnd} />
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <PayrollStatusBadge status={row.original.status} />,
  },
  { accessorKey: "grossTotal", header: "Gross", cell: ({ row }) => formatPayrollMoney(row.original.grossTotal) },
  { accessorKey: "deductionsTotal", header: "Deductions", cell: ({ row }) => formatPayrollMoney(row.original.deductionsTotal) },
  {
    accessorKey: "netTotal",
    header: "Net",
    cell: ({ row }) => (
      <span className="font-semibold text-[var(--success)]">
        {formatPayrollMoney(row.original.netTotal)}
      </span>
    ),
  },
  {
    accessorKey: "processedAt",
    header: "Processed",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-[var(--muted)]">
        <DisplayDateTime value={row.original.processedAt} />
      </span>
    ),
  },
];

export const contractColumns: ColumnDef<HrContract>[] = [
  {
    accessorKey: "contractNumber",
    header: "Contract #",
    cell: ({ row }) => <span className="font-mono text-sm font-semibold">{row.original.contractNumber}</span>,
  },
  {
    id: "employee",
    header: "Employee",
    cell: ({ row }) => (
      <EmployeePersonChip
        employee={{
          id: row.original.employee.id,
          fullName: row.original.employee.fullName,
          employeeNumber: row.original.employee.employeeNumber,
          hasAvatar: row.original.employee.hasAvatar,
        }}
        showPresence={false}
      />
    ),
  },
  {
    accessorKey: "contractType",
    header: "Type",
    cell: ({ row }) => <ContractTypeLabel type={row.original.contractType} />,
  },
  { accessorKey: "startDate", header: "Start", cell: ({ row }) => <DisplayDate value={row.original.startDate} /> },
  {
    accessorKey: "endDate",
    header: "End",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span><DisplayDate value={row.original.endDate} /></span>
        {row.original.isExpiringSoon && <ExpiryWarningBadge label="Expiring soon" />}
      </div>
    ),
  },
  { accessorKey: "salary", header: "Salary" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ContractStatusBadge status={row.original.status} />,
  },
];

export const documentColumns: ColumnDef<HrDocument>[] = [
  {
    id: "employee",
    header: "Employee",
    cell: ({ row }) => (
      <EmployeePersonChip
        employee={{
          id: row.original.employee.id,
          fullName: row.original.employee.fullName,
          employeeNumber: row.original.employee.employeeNumber,
          hasAvatar: row.original.employee.hasAvatar,
        }}
        showPresence={false}
      />
    ),
  },
  { accessorKey: "documentType", header: "Type" },
  { accessorKey: "title", header: "Title", cell: ({ row }) => <span className="line-clamp-1 max-w-[220px]">{row.original.title}</span> },
  {
    accessorKey: "expiryDate",
    header: "Expiry",
    cell: ({ row }) => {
      const warning = getDocumentExpiryWarningLabel(row.original);
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <DisplayDate value={row.original.expiryDate} />
          {warning ? <ExpiryWarningBadge label={warning} /> : null}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <DocumentStatusBadge status={row.original.status} />,
  },
];

export const positionColumns: ColumnDef<HrPosition>[] = [
  { accessorKey: "title", header: "Title", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  {
    id: "department",
    header: "Department",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.department.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.department.code}</p>
      </div>
    ),
  },
  { accessorKey: "level", header: "Level" },
  {
    accessorKey: "employeeCount",
    header: "Employees",
    cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.employeeCount}</span>,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <span className={row.original.isActive ? "text-[var(--success)]" : "text-[var(--muted)]"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];
