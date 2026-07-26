"use client";

import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Calculator,
  FileBarChart,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsPageSkeleton } from "@/components/reports/reports-page-skeleton";
import { useReportsOverview } from "@/lib/hooks/use-reports";
import { formatDisplayDateTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";

const REPORT_ICONS: Record<string, typeof FileBarChart> = {
  "shopping-cart": ShoppingCart,
  boxes: Boxes,
  truck: Truck,
  calculator: Calculator,
};

export default function ReportsOverviewPage() {
  const { t, locale } = useI18n();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useReportsOverview();

  if (loading && !overview) {
    return <ReportsPageSkeleton />;
  }

  if (error || !overview) {
    return (
      <ErrorState
        title="Unable to load reports"
        description={error ?? "No data"}
        onRetry={() => void refetch()}
      />
    );
  }

  const { executiveSummary } = overview;

  return (
    <>
      <FadeIn>
        <PageHeader
          title={t("reports.title")}
          description={t("reports.description")}
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{overview.totalReports} reports</Badge>
              <Badge variant="secondary">Export coming soon</Badge>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ReportsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Total Sales"
            value={executiveSummary.totalSales}
            change={`${executiveSummary.openSalesOrders} open orders · all time`}
            trend="neutral"
            icon={ShoppingCart}
          />
          <KpiCard
            title="Inventory Value"
            value={executiveSummary.inventoryValue}
            change={`${executiveSummary.lowStockItems} low-stock SKUs · at cost`}
            trend="neutral"
            icon={Boxes}
          />
          <KpiCard
            title="Procurement Spend"
            value={executiveSummary.procurementSpend}
            change={`${executiveSummary.openPurchaseOrders} open POs · all time`}
            trend="neutral"
            icon={Truck}
          />
          <KpiCard
            title="Net Profit (MTD)"
            value={executiveSummary.netProfit}
            change="Posted ledger · current month"
            trend="neutral"
            icon={Calculator}
          />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="grid gap-6 md:grid-cols-2">
          {overview.reportCategories.map((category) => (
            <PremiumCard key={category.id} className="overflow-hidden">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileBarChart className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {category.name}
                  </CardTitle>
                  <CardDescription>{category.reportCount} available reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.reports.map((report) => {
                    const Icon = REPORT_ICONS[report.icon] ?? FileBarChart;
                    return (
                      <Link
                        key={report.id}
                        href={report.href}
                        onClick={() => startNavigation(report.href)}
                        className="ierp-card-hover flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40">
                            <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{report.name}</p>
                            <p className="line-clamp-1 text-xs text-[var(--muted)]">{report.description}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </PremiumCard>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent Reports</CardTitle>
              <CardDescription>
                Last generated {formatDisplayDateTime(overview.lastGeneratedAt, locale)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={report.href}
                  onClick={() => startNavigation(report.href)}
                  className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{report.name}</p>
                    <p className="text-xs text-[var(--muted)]">{report.category}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    View report
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </>
  );
}
