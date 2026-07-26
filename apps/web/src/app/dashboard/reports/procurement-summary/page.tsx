"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBarChart, ValueBarChart } from "@/components/reports/lazy-report-charts";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { PO_STATUS_LABELS } from "@/components/procurement/po-status-badge";
import { useProcurementSummaryReport } from "@/lib/hooks/use-reports";
import { formatDisplayDate } from "@/lib/date";
import { parseMoney } from "@/lib/parse-money";
import { useI18n } from "@/lib/i18n";
import { CalendarClock, ClipboardList, Truck } from "lucide-react";
import type { PurchaseOrderStatus } from "@ierp/shared";

export default function ProcurementSummaryPage() {
  const { locale } = useI18n();
  const { data: report, loading, error, refetch } = useProcurementSummaryReport();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title="Unable to load procurement summary"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const statusChartData = report.purchaseOrdersByStatus.map((row) => ({
    label: PO_STATUS_LABELS[row.status as PurchaseOrderStatus] ?? row.status,
    count: row.count,
  }));

  const vendorChartData = report.spendByVendor.slice(0, 8).map((vendor) => ({
    label: vendor.code,
    value: parseMoney(vendor.totalSpend),
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title="Procurement Summary"
          description="Vendor spend, purchase order pipeline, and expected receipts."
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Live data</Badge>
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
          <KpiCard title="Total Spend" value={report.totalProcurementSpend} trend="neutral" icon={Truck} change="All time" />
          <KpiCard title="Purchase Orders" value={String(report.purchaseOrderCount)} trend="neutral" icon={ClipboardList} change="Excl. draft/cancelled" />
          <KpiCard title="Open POs" value={String(report.openPurchaseOrders)} trend="neutral" icon={CalendarClock} change="Sent / approved / partial" />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Spend by Vendor</CardTitle>
                <CardDescription>Top vendors by total spend</CardDescription>
              </CardHeader>
              <CardContent>
                <ValueBarChart data={vendorChartData} valueLabel="Spend" />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">PO Status Breakdown</CardTitle>
                <CardDescription>Order count by status</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={statusChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.12}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Top Vendors</CardTitle>
                <CardDescription>Ranked by procurement spend</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.spendByVendor.map((vendor) => (
                  <Link
                    key={vendor.id}
                    href={`/dashboard/procurement/vendors/${vendor.id}`}
                    className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{vendor.name}</p>
                      <p className="font-mono text-xs text-[var(--muted)]">{vendor.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{vendor.totalSpend}</p>
                      <p className="text-xs text-[var(--muted)]">{vendor.orderCount} POs</p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.14}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Expected Receipts</CardTitle>
                <CardDescription>Incoming purchase orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.expectedReceipts.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No expected receipts.</p>
                ) : (
                  report.expectedReceipts.map((po) => (
                    <Link
                      key={po.id}
                      href={`/dashboard/procurement/purchase-orders/${po.id}`}
                      className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold">{po.poNumber}</p>
                        <p className="text-xs text-[var(--muted)]">{po.vendorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{po.totalAmount}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDisplayDate(po.expectedDate, locale)}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>
    </>
  );
}
