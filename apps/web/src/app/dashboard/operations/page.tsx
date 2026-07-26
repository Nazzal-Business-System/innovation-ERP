"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Package, Truck } from "lucide-react";
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
import { OperationsNavLinks } from "@/components/operations/operations-gate";
import { OperationsPageSkeleton } from "@/components/operations/operations-page-skeleton";
import {
  deliveryColumns,
  goodsReceiptColumns,
} from "@/components/operations/operations-columns";
import { useOperationsOverview } from "@/lib/hooks/use-operations";
import { useI18n } from "@/lib/i18n";

export default function OperationsOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useOperationsOverview();

  if (loading) {
    return (
      <ModuleLayout>
        <OperationsPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load operations"
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
          title={t("operations.title")}
          description={t("operations.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <OperationsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title="Pending Receipts"
            value={String(overview.pendingReceipts)}
            change={`${overview.completedReceipts} completed`}
            trend={overview.pendingReceipts > 0 ? "up" : "neutral"}
            icon={ArrowDownToLine}
          />
          <KpiCard
            title="Pending Deliveries"
            value={String(overview.pendingDeliveries)}
            change={`${overview.completedDeliveries} delivered`}
            trend={overview.pendingDeliveries > 0 ? "up" : "neutral"}
            icon={ArrowUpFromLine}
          />
          <KpiCard
            title="Stock Impacts"
            value={String(overview.stockImpactsThisMonth)}
            change="Receipts & issues this month"
            trend="neutral"
            icon={Package}
          />
          <KpiCard
            title="Workflow Alerts"
            value={String(overview.workflowAlerts.length)}
            change="Requires attention"
            trend={overview.workflowAlerts.some((a) => a.type === "warning") ? "down" : "neutral"}
            icon={Truck}
          />
        </MetricGrid>
      </FadeIn>

      {overview.workflowAlerts.length > 0 && (
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Workflow Alerts</CardTitle>
                <CardDescription>Pending receipts, deliveries, and stock issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {overview.workflowAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                  >
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.type === "warning"
                          ? "text-[var(--warning)]"
                          : alert.type === "error"
                            ? "text-[var(--destructive)]"
                            : "text-[var(--info)]"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-[var(--muted)]">{alert.message}</p>
                    </div>
                    {alert.href && (
                      <Link
                        href={alert.href}
                        className="cursor-pointer shrink-0 text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-lg font-semibold">Recent Goods Receipts</h2>
                <p className="text-sm text-[var(--muted)]">Inbound from purchase orders</p>
              </div>
              <Link
                href="/dashboard/operations/goods-receipts"
                className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <DataTable
              columns={goodsReceiptColumns.slice(0, 5)}
              data={overview.recentGoodsReceipts}
              pageSize={5}
              emptyTitle="No goods receipts"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-lg font-semibold">Recent Deliveries</h2>
                <p className="text-sm text-[var(--muted)]">Outbound to customers</p>
              </div>
              <Link
                href="/dashboard/operations/deliveries"
                className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <DataTable
              columns={deliveryColumns.slice(0, 5)}
              data={overview.recentDeliveries}
              pageSize={5}
              emptyTitle="No deliveries"
            />
          </div>
        </FadeIn>
      </div>
    </ModuleLayout>
  );
}
