"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  Landmark,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { AccountingNavLinks } from "@/components/accounting/accounting-gate";
import { journalEntryColumns } from "@/components/accounting/accounting-columns";
import { AccountingPageSkeleton } from "@/components/accounting/accounting-page-skeleton";
import { useAccountingOverview } from "@/lib/hooks/use-accounting";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { JournalEntry } from "@ierp/shared";

export default function AccountingOverviewPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useAccountingOverview();

  function handleRowClick(entry: JournalEntry) {
    const href = `/dashboard/accounting/journal-entries/${entry.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) {
    return (
      <ModuleLayout>
        <AccountingPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load accounting"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <div>
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("accounting.title")}
          description={t("accounting.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <AccountingNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Total Assets"
            value={overview.totalAssets}
            change="Posted balances"
            trend="neutral"
            icon={Landmark}
          />
          <KpiCard
            title="Total Liabilities"
            value={overview.totalLiabilities}
            change="Including VAT payable"
            trend="neutral"
            icon={Scale}
          />
          <KpiCard
            title="Owner Equity"
            value={overview.totalEquity}
            change="Book value"
            trend="neutral"
            icon={Wallet}
          />
          <KpiCard
            title="Net Profit (MTD)"
            value={overview.netProfit}
            change={overview.periodLabel ? `${overview.periodLabel} · Rev ${overview.monthlyRevenue}` : `Rev ${overview.monthlyRevenue}`}
            trend={overview.netProfit.startsWith("-") ? "down" : "neutral"}
            icon={Calculator}
          />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.08}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Accounts Receivable"
            value={overview.accountsReceivable}
            change="Outstanding customer balances"
            trend="neutral"
            icon={ArrowDownLeft}
          />
          <KpiCard
            title="Accounts Payable"
            value={overview.accountsPayable}
            change="Vendor obligations"
            trend="neutral"
            icon={ArrowUpRight}
          />
          <KpiCard
            title="Monthly Revenue"
            value={overview.monthlyRevenue}
            change={overview.periodLabel ?? "Posted sales revenue"}
            trend="neutral"
            icon={TrendingUp}
          />
          <KpiCard
            title="Monthly Expenses"
            value={overview.monthlyExpenses}
            change="Operating costs MTD"
            trend="neutral"
            icon={TrendingDown}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Expense Breakdown</CardTitle>
                <CardDescription>Posted expense accounts by amount</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.expenseBreakdown.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No expense activity yet.</p>
                ) : (
                  overview.expenseBreakdown.map((item) => (
                    <div
                      key={item.accountCode}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.accountName}</p>
                        <p className="font-mono text-xs text-[var(--muted)]">{item.accountCode}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{item.amount}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.12}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription>Last 6 months — revenue vs expenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.revenueTrend.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No trend data available.</p>
                ) : (
                  overview.revenueTrend.map((row) => (
                    <div
                      key={row.month}
                      className="rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                        {row.month}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] text-[var(--muted)]">Revenue</p>
                          <p className="text-sm font-semibold tabular-nums text-[var(--success)]">
                            {row.revenue}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[var(--muted)]">Expenses</p>
                          <p className="text-sm font-semibold tabular-nums">{row.expenses}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-lg font-semibold">Recent Journal Entries</h2>
              <p className="text-sm text-[var(--muted)]">Latest general ledger activity</p>
            </div>
            <Link
              href="/dashboard/accounting/journal-entries"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <DataTable
            columns={journalEntryColumns}
            data={overview.recentJournalEntries}
            pageSize={8}
            onRowClick={handleRowClick}
            interactiveRows
          />
        </div>
      </FadeIn>
    </ModuleLayout>
    </div>
  );
}
