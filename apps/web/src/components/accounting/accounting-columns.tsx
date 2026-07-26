"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  AccountingAccount,
  JournalEntry,
  JournalEntryLine,
  JournalEntryLineSummary,
  TrialBalanceRow,
} from "@ierp/shared";
import { MasterDataLifecycleBadge } from "@/components/data-display/master-data-lifecycle-badge";
import {
  AccountTypeBadge,
  JeStatusBadge,
  NORMAL_BALANCE_LABELS,
} from "@/components/accounting/je-status-badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export const accountColumns: ColumnDef<AccountingAccount>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/accounting/chart-of-accounts/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Account name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <AccountTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "normalBalance",
    header: "Normal balance",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {NORMAL_BALANCE_LABELS[row.original.normalBalance]}
      </span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <MasterDataLifecycleBadge
        state={row.original.isProtected ? "protected" : row.original.isActive ? "active" : "inactive"}
      />
    ),
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{row.original.balance ?? "—"}</span>
    ),
  },
];

export const journalEntryColumns: ColumnDef<JournalEntry>[] = [
  {
    accessorKey: "entryNumber",
    header: "Entry #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/accounting/journal-entries/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.entryNumber}
      </Link>
    ),
  },
  {
    accessorKey: "entryDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">{row.original.entryDate}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-[240px] text-sm">{row.original.description}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <JeStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "totalDebit",
    header: "Debit",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalDebit}</span>
    ),
  },
  {
    accessorKey: "totalCredit",
    header: "Credit",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalCredit}</span>
    ),
  },
  {
    id: "source",
    header: "Source",
    cell: ({ row }) => (
      <div>
        {row.original.sourceModule ? (
          <>
            <p className="text-sm">{row.original.sourceModule}</p>
            {row.original.sourceReference && (
              <p className="font-mono text-xs text-[var(--muted)]">{row.original.sourceReference}</p>
            )}
          </>
        ) : (
          <span className="text-sm text-[var(--muted)]">Manual</span>
        )}
      </div>
    ),
  },
];

export const journalLineColumns: ColumnDef<JournalEntryLine>[] = [
  {
    accessorKey: "accountCode",
    header: "Account",
    cell: ({ row }) => (
      <div>
        <p className="font-mono text-sm font-semibold">{row.original.accountCode}</p>
        <p className="text-xs text-[var(--muted)]">{row.original.accountName}</p>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Line description",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.description ?? "—"}</span>
    ),
  },
  {
    accessorKey: "debit",
    header: "Debit",
    cell: ({ row }) => (
      <span
        className={cn(
          "tabular-nums",
          row.original.debit !== "JOD 0.00" && "font-semibold text-[var(--foreground)]"
        )}
      >
        {row.original.debit}
      </span>
    ),
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => (
      <span
        className={cn(
          "tabular-nums",
          row.original.credit !== "JOD 0.00" && "font-semibold text-[var(--foreground)]"
        )}
      >
        {row.original.credit}
      </span>
    ),
  },
];

export const accountLineColumns: ColumnDef<JournalEntryLineSummary>[] = [
  {
    accessorKey: "entryNumber",
    header: "Entry #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/accounting/journal-entries/${row.original.entryId}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.entryNumber}
      </Link>
    ),
  },
  {
    accessorKey: "entryDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">{row.original.entryDate}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.description ?? "—"}</span>
    ),
  },
  {
    accessorKey: "debit",
    header: "Debit",
    cell: ({ row }) => <span className="tabular-nums">{row.original.debit}</span>,
  },
  {
    accessorKey: "credit",
    header: "Credit",
    cell: ({ row }) => <span className="tabular-nums">{row.original.credit}</span>,
  },
  {
    accessorKey: "entryStatus",
    header: "Status",
    cell: ({ row }) => <JeStatusBadge status={row.original.entryStatus} />,
  },
];

export const trialBalanceColumns: ColumnDef<TrialBalanceRow>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.code}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Account",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <AccountTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "totalDebit",
    header: "Debit",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalDebit}</span>
    ),
  },
  {
    accessorKey: "totalCredit",
    header: "Credit",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalCredit}</span>
    ),
  },
  {
    accessorKey: "endingBalance",
    header: "Ending balance",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{row.original.endingBalance}</span>
    ),
  },
  {
    accessorKey: "normalBalance",
    header: "Normal",
    cell: ({ row }) => (
      <span className="text-xs text-[var(--muted)]">
        {NORMAL_BALANCE_LABELS[row.original.normalBalance]}
      </span>
    ),
  },
];

export function BalancedIndicator({ isBalanced }: { isBalanced: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        isBalanced
          ? "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]"
          : "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]"
      )}
    >
      {isBalanced ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      {isBalanced ? "Balanced" : "Out of balance"}
    </span>
  );
}
