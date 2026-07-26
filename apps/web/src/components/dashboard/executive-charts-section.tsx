"use client";

import { BarChart3, LineChart, TrendingUp } from "lucide-react";
import type { ExecutiveDashboardCharts } from "@ierp/shared";
import { SmartChartCard } from "@/components/charts/smart-chart-card";

interface ExecutiveChartsSectionProps {
  charts: ExecutiveDashboardCharts;
  currency?: string;
}

export function ExecutiveChartsSection({ charts, currency = "JOD" }: ExecutiveChartsSectionProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <SmartChartCard
        widgetId="exec-revenue-trend"
        title="Revenue Trend"
        description="Monthly revenue · last 6 months"
        icon={LineChart}
        data={charts.revenueTrend}
        currency={currency}
        defaultType="area"
        valueLabel="Revenue"
        colSpan="wide"
      />

      <SmartChartCard
        widgetId="exec-monthly-orders"
        title="Monthly Orders"
        description="Order volume by month"
        icon={BarChart3}
        data={charts.monthlyOrders}
        defaultType="bar"
        valueLabel="Orders"
      />

      <SmartChartCard
        widgetId="exec-branch-comparison"
        title="Branch Comparison"
        description="Revenue and order volume · Amman vs Irbid"
        icon={TrendingUp}
        data={charts.branchComparison}
        currency={currency}
        defaultType="composed"
        valueLabel="Revenue"
        secondaryLabel="Orders"
        colSpan="full"
      />
    </div>
  );
}
