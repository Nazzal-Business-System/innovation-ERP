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
import { ValueBarChart } from "@/components/reports/lazy-report-charts";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { useInventoryValuationReport } from "@/lib/hooks/use-reports";
import { parseMoney } from "@/lib/parse-money";
import { AlertTriangle, Boxes, Package } from "lucide-react";

export default function InventoryValuationPage() {
  const { data: report, loading, error, refetch } = useInventoryValuationReport();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title="Unable to load inventory valuation"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const warehouseChart = report.valueByWarehouse.map((wh) => ({
    label: wh.code,
    value: parseMoney(wh.totalValue),
  }));

  const categoryChart = report.valueByCategory.slice(0, 8).map((cat) => ({
    label: cat.category,
    value: parseMoney(cat.totalValue),
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title="Inventory Valuation"
          description="Stock value by warehouse, category, and product ranking."
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Cost-based</Badge>
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
          <KpiCard title="Total Value" value={report.totalInventoryValue} trend="neutral" icon={Boxes} change="At cost · active SKUs" />
          <KpiCard title="Total Units" value={report.totalUnits.toLocaleString()} trend="neutral" icon={Package} change="On hand" />
          <KpiCard title="Low Stock" value={String(report.lowStockItems.length)} trend={report.lowStockItems.length > 0 ? "down" : "neutral"} icon={AlertTriangle} change="At/below reorder" />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Value by Warehouse</CardTitle>
                <CardDescription>Inventory value per location</CardDescription>
              </CardHeader>
              <CardContent>
                <ValueBarChart data={warehouseChart} valueLabel="Value" />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.1}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Value by Category</CardTitle>
                <CardDescription>Stock value distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ValueBarChart data={categoryChart} valueLabel="Value" />
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
                <CardTitle className="text-base">Low Stock Items</CardTitle>
                <CardDescription>SKUs at or below reorder level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.lowStockItems.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No low-stock items.</p>
                ) : (
                  report.lowStockItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/dashboard/inventory/products/${item.id}`}
                      className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                    >
                      <div>
                        <p className="font-mono text-sm font-semibold">{item.sku}</p>
                        <p className="text-xs text-[var(--muted)]">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {item.onHand} / {item.reorderLevel}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{item.value}</p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.14}>
          <PremiumCard className="overflow-hidden">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Top Value Products</CardTitle>
                <CardDescription>Highest inventory value SKUs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.topValueProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/dashboard/inventory/products/${product.id}`}
                    className="ierp-card-hover flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">{product.sku}</p>
                      <p className="text-xs text-[var(--muted)]">{product.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{product.totalValue}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {product.onHand.toLocaleString()} @ {product.unitCost}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>
    </>
  );
}
