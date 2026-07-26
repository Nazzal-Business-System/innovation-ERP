"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Lock,
  Package,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { LazySmartChartCard as SmartChartCard } from "@/components/charts/lazy-smart-chart-card";
import { DataTable } from "@/components/data-display/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { ModuleLayout } from "@/components/layout/module-layout";
import { ModuleOverviewShell } from "@/components/layout/module-overview-shell";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { movementColumns } from "@/components/inventory/inventory-columns";
import { useInventoryMovements, useInventoryOverview } from "@/lib/hooks/use-inventory";
import { useI18n } from "@/lib/i18n";
import type { ActivityTimelineItem, InventoryMovement } from "@ierp/shared";

function movementCategory(type: InventoryMovement["type"]): ActivityTimelineItem["category"] {
  switch (type) {
    case "RECEIPT":
    case "ISSUE":
      return "finance";
    case "TRANSFER_IN":
    case "TRANSFER_OUT":
    case "ADJUSTMENT":
      return "inventory";
    default:
      return "operations";
  }
}

function mapMovementsToActivity(movements: InventoryMovement[] | undefined): ActivityTimelineItem[] {
  if (!movements) return [];
  return movements.slice(0, 5).map((m) => ({
    id: m.id,
    title: `${m.type.replace(/_/g, " ")} · ${m.product.sku}`,
    description: m.notes ?? m.reference ?? "",
    time: new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    category: movementCategory(m.type),
    status: m.type === "RECEIPT" || m.type === "TRANSFER_IN" ? "active" : "info",
  }));
}

export default function InventoryOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useInventoryOverview();
  const { data: movements } = useInventoryMovements({ page: 1 });

  if (loading && !overview) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load inventory" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const categoryChartData = overview.topCategories.map((c) => ({
    label: c.category,
    value: c.totalUnits,
  }));

  return (
    <ModuleOverviewShell
      hero={{
        title: t("inventory.title"),
        description: t("inventory.description"),
        eyebrow: "Inventory",
        icon: Boxes,
        badge: <Badge variant="outline">{t("common.liveData")}</Badge>,
      }}
      nav={<InventoryNavLinks />}
      kpis={
        <MetricGrid columns={4}>
          <KpiCard title="Total SKUs" value={String(overview.totalSkus)} change={`${overview.activeProducts} active`} icon={Package} />
          <KpiCard title="Units on Hand" value={overview.totalUnitsOnHand.toLocaleString()} change="All warehouses" trend="neutral" icon={Boxes} />
          <KpiCard title={t("inventory.reservedStock")} value={overview.totalUnitsReserved.toLocaleString()} icon={Lock} />
          <KpiCard title="Inventory Value" value={overview.totalInventoryValue} change="On hand × cost" trend="neutral" icon={TrendingUp} />
        </MetricGrid>
      }
      charts={
        <SmartChartCard
          widgetId="inventory-categories"
          title="Stock by Category"
          description="Units on hand by product category"
          data={categoryChartData}
          defaultType="bar"
          valueLabel="Units"
        />
      }
      main={
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              Warehouse Summary
            </CardTitle>
            <CardDescription>{overview.warehouseCount} active locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.warehouseSummary.map((wh) => (
              <Link
                key={wh.id}
                href="/dashboard/inventory/warehouses"
                className="block cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-4 hover:border-[var(--sidebar-active-border)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{wh.name}</p>
                    <p className="text-xs text-[var(--muted)]">{wh.branch} · {wh.code}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-semibold">{wh.totalValue}</p>
                    <p className="text-xs text-[var(--muted)]">{wh.totalUnits.toLocaleString()} units</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      }
      sidebar={
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KpiCard
              title="Low Stock"
              value={String(overview.lowStockCount)}
              change={overview.lowStockCount > 0 ? "Needs attention" : "All healthy"}
              trend={overview.lowStockCount > 0 ? "down" : "neutral"}
              icon={AlertTriangle}
            />
            <KpiCard
              title={t("inventory.transfersInTransit")}
              value={String(overview.transfersInTransit)}
              icon={ArrowRightLeft}
            />
          </CardContent>
        </Card>
      }
      activity={
        <>
          <ActivityTimeline
            title="Recent Movements"
            description={`${overview.recentMovementCount} movements in the last 7 days`}
            items={mapMovementsToActivity(movements?.data)}
          />
          {movements?.data && movements.data.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Latest Transactions</h2>
                <Link href="/dashboard/inventory/movements" className="text-sm font-medium text-[var(--accent)] hover:underline">
                  View all →
                </Link>
              </div>
              <DataTable columns={movementColumns} data={movements.data.slice(0, 5)} pageSize={5} />
            </div>
          )}
        </>
      }
    />
  );
}
