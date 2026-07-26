"use client";

import type {
  AttendanceStatus,
  ContractStatus,
  ContractType,
  DocumentStatus,
  EmploymentStatus,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
} from "@ierp/shared";
import { AlertTriangle, Ban, Briefcase, Calendar, CheckCircle2, Clock, FileWarning, Home, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  TERMINATED: "Terminated",
  PROBATION: "Probation",
};

const EMPLOYMENT_STATUS_STYLES: Record<EmploymentStatus, string> = {
  ACTIVE: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  ON_LEAVE: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  TERMINATED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  PROBATION: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  REMOTE: "Remote",
  HALF_DAY: "Half Day",
};

const ATTENDANCE_STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  LATE: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  ABSENT: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  REMOTE: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  HALF_DAY: "border-[var(--accent)]/25 bg-[var(--accent-muted)] text-[var(--accent)]",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  UNPAID: "Unpaid",
  EMERGENCY: "Emergency",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const LEAVE_STATUS_STYLES: Record<LeaveStatus, string> = {
  PENDING: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  APPROVED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  REJECTED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  CANCELLED: "border-[var(--muted)]/40 bg-[var(--muted-bg)] text-[var(--muted)]",
};

interface EmploymentStatusBadgeProps {
  status: EmploymentStatus;
  className?: string;
}

export function EmploymentStatusBadge({ status, className }: EmploymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        EMPLOYMENT_STATUS_STYLES[status],
        className
      )}
    >
      <Briefcase className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {EMPLOYMENT_STATUS_LABELS[status]}
    </span>
  );
}

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
}

const ATTENDANCE_ICONS: Record<AttendanceStatus, typeof CheckCircle2> = {
  PRESENT: CheckCircle2,
  LATE: Clock,
  ABSENT: UserX,
  REMOTE: Home,
  HALF_DAY: Calendar,
};

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const Icon = ATTENDANCE_ICONS[status] ?? CheckCircle2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ATTENDANCE_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
  className?: string;
}

export function LeaveStatusBadge({ status, className }: LeaveStatusBadgeProps) {
  const Icon =
    status === "REJECTED" || status === "CANCELLED"
      ? Ban
      : status === "APPROVED"
        ? CheckCircle2
        : Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        LEAVE_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {LEAVE_STATUS_LABELS[status]}
    </span>
  );
}

const PAYROLL_STATUS_STYLES: Record<PayrollStatus, string> = {
  DRAFT: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  PROCESSED: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  PARTIALLY_PAID: "border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]",
  PAID: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  CANCELLED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

export function PayrollStatusBadge({ status, className }: { status: PayrollStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", PAYROLL_STATUS_STYLES[status], className)}>
      {t(`hr.payrollStatus.${status}`)}
    </span>
  );
}

const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
  ACTIVE: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  EXPIRED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  TERMINATED: "border-[var(--muted)]/25 bg-[var(--muted-bg)] text-[var(--muted-foreground)]",
  DRAFT: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
};

export function ContractStatusBadge({ status, className }: { status: ContractStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", CONTRACT_STATUS_STYLES[status], className)}>
      {t(`hr.contractStatus.${status}`)}
    </span>
  );
}

export function ContractTypeLabel({ type }: { type: ContractType }) {
  const { t } = useI18n();
  return <span>{t(`hr.contractType.${type}`)}</span>;
}

const DOCUMENT_STATUS_STYLES: Record<DocumentStatus, string> = {
  VALID: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  EXPIRED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  MISSING: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  PENDING_REVIEW: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
};

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const { t } = useI18n();
  const Icon = status === "MISSING" ? FileWarning : status === "EXPIRED" ? AlertTriangle : CheckCircle2;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", DOCUMENT_STATUS_STYLES[status], className)}>
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {t(`hr.documentStatus.${status}`)}
    </span>
  );
}

export function ExpiryWarningBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--warning)]/25 bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
