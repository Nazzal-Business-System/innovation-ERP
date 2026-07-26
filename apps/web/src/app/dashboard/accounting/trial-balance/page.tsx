"use client";

import { useState } from "react";
import { selectClassName } from "@/lib/form-utils";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { AccountingNavLinks } from "@/components/accounting/accounting-gate";
import { BalancedIndicator, trialBalanceColumns } from "@/components/accounting/accounting-columns";
import { AccountingTableSkeleton } from "@/components/accounting/accounting-page-skeleton";
import { ACCOUNT_TYPE_LABELS } from "@/components/accounting/je-status-badge";
import { useTrialBalance } from "@/lib/hooks/use-accounting";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  { value: "", label: "All types" },
  ...Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];


export default function TrialBalancePage() {
  const [type, setType] = useState("");
  const { data, loading, error, refetch } = useTrialBalance(type || undefined);

  if (loading && !data) {
    return (
      <ModuleLayout>
        <AccountingTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load trial balance"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Trial Balance"
          description="Posted account balances — debits, credits, and ending balances by account."
          badge={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{data.rows.length} accounts</Badge>
              <BalancedIndicator isBalanced={data.totals.isBalanced} />
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <AccountingNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Trial balance report"
            description="Based on posted journal entries only."
            actions={
              <select
                aria-label="Filter by account type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={cn(selectClassName, "min-w-[10rem]")}
              >
                {ACCOUNT_TYPES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />

          <DataTable
            columns={trialBalanceColumns}
            data={data.rows}
            emptyTitle="No accounts with activity"
            emptyDescription="No posted journal lines match the selected filter."
            pageSize={20}
          />

          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30">
            <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[var(--muted)]">Total debit</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{data.totals.totalDebit}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Total credit</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{data.totals.totalCredit}</p>
              </div>
              <div className="sm:col-span-2 sm:flex sm:items-center sm:justify-end">
                <BalancedIndicator isBalanced={data.totals.isBalanced} />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
