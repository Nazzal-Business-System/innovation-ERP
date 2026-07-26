"use client";

import Link from "next/link";
import { Building2, CalendarClock, ClipboardList, Truck, Users } from "lucide-react";
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
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { ProcurementPageSkeleton } from "@/components/procurement/procurement-page-skeleton";
import { purchaseOrderColumns } from "@/components/procurement/procurement-columns";
import { PoStatusBadge } from "@/components/procurement/po-status-badge";
import { useProcurementOverview } from "@/lib/hooks/use-procurement";
import { useI18n } from "@/lib/i18n";
import type { PurchaseOrderStatus } from "@ierp/shared";

export default function ProcurementOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useProcurementOverview();

  if (loading && !overview) {
    return (
      <ModuleLayout>
        <ProcurementPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load procurement"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusTotal = overview.purchaseOrdersByStatus.reduce((s, r) => s + r.count, 0);

  return (
    <div>
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("procurement.title")}
          description={t("procurement.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProcurementNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Active Vendors"
            value={String(overview.activeVendors)}
            change={`${overview.totalVendors} total`}
            trend="neutral"
            icon={Users}
          />
          <KpiCard
            title="Open POs"
            value={String(overview.openPurchaseOrders)}
            change="Sent / approved / partially received"
            trend="neutral"
            icon={ClipboardList}
          />
          <KpiCard
            title="Pending Approval"
            value={String(overview.pendingApprovals)}
            change="Sent to vendors"
            trend={overview.pendingApprovals > 0 ? "down" : "neutral"}
            icon={Truck}
          />
          <KpiCard
            title="Monthly Spend"
            value={overview.monthlyProcurementSpend}
            change={`${overview.expectedReceipts} expected receipts · current month`}
            trend="neutral"
            icon={Building2}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">PO Status Breakdown</CardTitle>
                <CardDescription>{statusTotal} purchase orders total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.purchaseOrdersByStatus.map((row) => (
                  <div
                    key={row.status}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                  >
                    <PoStatusBadge status={row.status as PurchaseOrderStatus} />
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
                  Expected Receipts
                </CardTitle>
                <CardDescription>Approved POs arriving soon</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.expectedReceiptList.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No upcoming receipts scheduled.</p>
                ) : (
                  overview.expectedReceiptList.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/procurement/purchase-orders/${item.id}`}
                      className="ierp-card-hover block cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-semibold">{item.poNumber}</p>
                          <p className="text-xs text-[var(--muted)]">{item.vendorName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{item.totalAmount}</p>
                          <p className="text-xs text-[var(--muted)]">{item.expectedDate}</p>
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
              <CardTitle className="text-base">Top Vendors by Spend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.topVendors.map((vendor) => (
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
                    <p className="text-sm font-semibold">{vendor.totalSpend}</p>
                    <p className="text-xs text-[var(--muted)]">{vendor.openOrders} open POs</p>
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
              <h2 className="text-lg font-semibold">Recent Purchase Orders</h2>
              <p className="text-sm text-[var(--muted)]">Latest procurement activity</p>
            </div>
            <Link
              href="/dashboard/procurement/purchase-orders"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <DataTable
            columns={purchaseOrderColumns}
            data={overview.recentPurchaseOrders}
            pageSize={8}
          />
        </div>
      </FadeIn>
    </ModuleLayout>
    </div>
  );
}
