"use client";

import type { AccountType, JournalEntryStatus, NormalBalance } from "@ierp/shared";
import { Ban, CheckCircle2, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

export const JE_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  VOID: "Void",
};

const JE_STATUS_STYLES: Record<JournalEntryStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  POSTED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  VOID: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

const JE_STATUS_ICONS: Record<JournalEntryStatus, typeof FileEdit> = {
  DRAFT: FileEdit,
  POSTED: CheckCircle2,
  VOID: Ban,
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
};

export const NORMAL_BALANCE_LABELS: Record<NormalBalance, string> = {
  DEBIT: "Debit",
  CREDIT: "Credit",
};

interface JeStatusBadgeProps {
  status: JournalEntryStatus;
  className?: string;
}

export function JeStatusBadge({ status, className }: JeStatusBadgeProps) {
  const Icon = JE_STATUS_ICONS[status] ?? FileEdit;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        JE_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {JE_STATUS_LABELS[status]}
    </span>
  );
}

interface AccountTypeBadgeProps {
  type: AccountType;
  className?: string;
}

const ACCOUNT_TYPE_STYLES: Record<AccountType, string> = {
  ASSET: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  LIABILITY: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  EQUITY: "border-[var(--accent)]/25 bg-[var(--accent-muted)] text-[var(--accent)]",
  REVENUE: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  EXPENSE: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

export function AccountTypeBadge({ type, className }: AccountTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ACCOUNT_TYPE_STYLES[type],
        className
      )}
    >
      {ACCOUNT_TYPE_LABELS[type]}
    </span>
  );
}
