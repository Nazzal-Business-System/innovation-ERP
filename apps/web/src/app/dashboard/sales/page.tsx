"use client";

import Link from "next/link";
import { CalendarClock, ClipboardList, ShoppingCart, TrendingUp, Users } from "lucide-react";
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
import { SalesNavLinks } from "@/components/sales/sales-gate";
import { SalesPageSkeleton } from "@/components/sales/sales-page-skeleton";
import { salesOrderColumns } from "@/components/sales/sales-columns";
import { SoStatusBadge } from "@/components/sales/so-status-badge";
import { useSalesOverview } from "@/lib/hooks/use-sales";
import { useI18n } from "@/lib/i18n";
import type { SalesOrderStatus } from "@ierp/shared";

export default function SalesOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useSalesOverview();

  if (loading && !overview) {
    return (
      <ModuleLayout>
        <SalesPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load sales"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusTotal = overview.salesOrdersByStatus.reduce((s, r) => s + r.count, 0);

  return (
    <div>
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("sales.title")}
          description={t("sales.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SalesNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Active Customers"
            value={String(overview.activeCustomers)}
            change={`${overview.totalCustomers} total`}
            trend="neutral"
            icon={Users}
          />
          <KpiCard
            title="Open Orders"
            value={String(overview.openSalesOrders)}
            change="Confirmed / picking / ready to ship"
            trend="neutral"
            icon={ClipboardList}
          />
          <KpiCard
            title="Pending Shipments"
            value={String(overview.pendingShipments)}
            change="Same open fulfillment set"
            trend={overview.pendingShipments > 0 ? "down" : "neutral"}
            icon={ShoppingCart}
          />
          <KpiCard
            title="Monthly Sales"
            value={overview.monthlySales}
            change={`Avg ${overview.averageOrderValue} · current month`}
            trend="neutral"
            icon={TrendingUp}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Order Status Breakdown</CardTitle>
                <CardDescription>{statusTotal} sales orders total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.salesOrdersByStatus.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                  >
                    <SoStatusBadge status={row.status as SalesOrderStatus} />
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${statusTotal ? (row.count / statusTotal) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-semibold tabular-nums">
                        {row.count}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  Pending Shipments
                </CardTitle>
                <CardDescription>Orders awaiting fulfillment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.pendingShipmentList.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No pending shipments.</p>
                ) : (
                  overview.pendingShipmentList.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/sales/orders/${item.id}`}
                      className="ierp-card-hover block cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold">{item.soNumber}</p>
                          <p className="text-xs text-[var(--muted)]">{item.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{item.totalAmount}</p>
                          <p className="text-xs text-[var(--muted)]">{item.expectedDeliveryDate}</p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Top Customers by Sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.topCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/sales/customers/${customer.id}`}
                  className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{customer.name}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">{customer.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{customer.totalSales}</p>
                    <p className="text-xs text-[var(--muted)]">{customer.openOrders} open orders</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-lg font-semibold">Recent Sales Orders</h2>
              <p className="text-sm text-[var(--muted)]">Latest outbound order activity</p>
            </div>
            <Link
              href="/dashboard/sales/orders"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <DataTable columns={salesOrderColumns} data={overview.recentSalesOrders} pageSize={8} />
        </div>
      </FadeIn>
    </ModuleLayout>
    </div>
  );
}
