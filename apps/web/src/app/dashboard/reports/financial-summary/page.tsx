"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { PageHeader } from "@/components/layout/page-header";
import { BalancedIndicator } from "@/components/accounting/accounting-columns";
import { DualTrendChart } from "@/components/reports/lazy-report-charts";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { useFinancialSummaryReport } from "@/lib/hooks/use-reports";
import { Landmark, Scale, TrendingDown, TrendingUp, Wallet } from "lucide-react";

export default function FinancialSummaryPage() {
  const { data: report, loading, error, refetch } = useFinancialSummaryReport();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title="Unable to load financial summary"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <FadeIn>
        <PageHeader
          title="Financial Summary"
          description="Balance sheet snapshot, P&L, and trial balance status from posted entries."
          badge={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Posted ledger</Badge>
              <BalancedIndicator isBalanced={report.trialBalanceStatus.isBalanced} />
              <Badge variant="secondary">Export coming soon</Badge>
            </div>
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ReportsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <MetricGrid columns={3}>
          <KpiCard title="Assets" value={report.assets} trend="neutral" icon={Landmark} change="Book value · all time" />
          <KpiCard title="Liabilities" value={report.liabilities} trend="neutral" icon={Scale} change="Including AP/VAT · all time" />
          <KpiCard title="Equity" value={report.equity} trend="neutral" icon={Wallet} change="Owner equity · all time" />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.08}>
        <MetricGrid columns={3}>
          <KpiCard title="Revenue (MTD)" value={report.revenue} trend="neutral" icon={TrendingUp} change={report.periodLabel ?? "Posted sales"} />
          <KpiCard title="Expenses (MTD)" value={report.expenses} trend="neutral" icon={TrendingDown} change={report.periodLabel ?? "Operating costs"} />
          <KpiCard title="Net Profit (MTD)" value={report.netProfit} trend="neutral" icon={Scale} change="Revenue − expenses" />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                <CardDescription>Last 6 months trend</CardDescription>
              </CardHeader>
              <CardContent>
                {report.revenueTrend.length > 0 ? (
                  <DualTrendChart data={report.revenueTrend} />
                ) : (
                  <p className="py-12 text-center text-sm text-[var(--muted)]">No trend data available.</p>
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.12}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Trial Balance Status</CardTitle>
                <CardDescription>Posted debits and credits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/20 px-4 py-8 text-center">
                  <BalancedIndicator isBalanced={report.trialBalanceStatus.isBalanced} />
                  <div className="grid w-full grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Total debit</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {report.trialBalanceStatus.totalDebit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Total credit</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">
                        {report.trialBalanceStatus.totalCredit}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.14}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Expense Breakdown</CardTitle>
              <CardDescription>Posted expense accounts by amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.expenseBreakdown.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No expense activity.</p>
              ) : (
                report.expenseBreakdown.map((item) => (
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
    </>
  );
}
