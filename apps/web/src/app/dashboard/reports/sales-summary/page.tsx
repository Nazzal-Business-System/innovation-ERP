"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { LazySmartChartCard as SmartChartCard } from "@/components/charts/lazy-smart-chart-card";
import { ErrorState } from "@/components/feedback/error-state";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { SO_STATUS_LABELS } from "@/components/sales/so-status-badge";
import { useSalesSummaryReport } from "@/lib/hooks/use-reports";
import { toChartPoints } from "@/lib/chart-data-utils";
import { parseMoney } from "@/lib/parse-money";
import { ClipboardList, TrendingUp, Users } from "lucide-react";
import type { SalesOrderStatus } from "@ierp/shared";

export default function SalesSummaryPage() {
  const { data: report, loading, error, refetch } = useSalesSummaryReport();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title="Unable to load sales summary"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const statusChartData = report.salesByStatus.map((row) => ({
    label: SO_STATUS_LABELS[row.status as SalesOrderStatus] ?? row.status,
    count: row.count,
  }));

  const cityChartData = report.salesByCity.slice(0, 8).map((row) => ({
    label: row.city,
    value: parseMoney(row.totalSales),
  }));

  return (
    <>
      <header className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-6">
        <h1 className="text-2xl font-semibold">Sales Summary</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Revenue performance, customer rankings, and regional breakdown.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">Live data</Badge>
        </div>
      </header>
      <ReportsNavLinks />
      <MetricGrid columns={3}>
        <KpiCard title="Total Sales" value={report.totalSales} trend="neutral" icon={TrendingUp} change="All time · excl. draft/cancelled" />
        <KpiCard
          title="Orders"
          value={String(report.orderCount)}
          trend="neutral"
          icon={ClipboardList}
          change="Excl. draft/cancelled"
        />
        <KpiCard
          title="Avg Order Value"
          value={report.averageOrderValue}
          trend="neutral"
          icon={Users}
          change="Per order"
        />
      </MetricGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <SmartChartCard
          widgetId="report-sales-trend"
          title="Monthly Sales Trend"
          description="Last 6 months revenue"
          data={report.monthlySalesTrend}
          defaultType="area"
          valueLabel="Sales"
        />
        <SmartChartCard
          widgetId="report-sales-status"
          title="Sales by Status"
          description="Order count by workflow stage"
          data={toChartPoints(statusChartData)}
          defaultType="bar"
          valueLabel="Orders"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-semibold">Top Customers</h2>
          <p className="text-xs text-[var(--muted)]">By total sales volume</p>
          <div className="mt-4 space-y-2">
            {report.topCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/dashboard/sales/customers/${customer.id}`}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 hover:bg-[var(--muted-bg)]/40"
              >
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="font-mono text-xs text-[var(--muted)]">{customer.code}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm font-semibold tabular-nums">{customer.totalSales}</p>
                  <p className="text-xs text-[var(--muted)]">{customer.orderCount} orders</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <SmartChartCard
          widgetId="report-sales-city"
          title="Sales by City"
          description="Regional revenue distribution"
          data={toChartPoints(cityChartData)}
          defaultType="horizontalBar"
          valueLabel="Sales"
        />
      </div>
    </>
  );
}
