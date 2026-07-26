"use client";

import type { ChartDataPoint } from "@ierp/shared";
import { formatChartCurrency } from "@/components/dashboard/charts/chart-theme";

interface MetricTextViewProps {
  data: ChartDataPoint[];
  currency?: string;
  valueLabel?: string;
}

export function MetricTextView({ data, currency = "JOD", valueLabel = "Total" }: MetricTextViewProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const change =
    previous && previous.value !== 0
      ? ((latest.value - previous.value) / previous.value) * 100
      : null;

  return (
    <div className="flex h-[220px] flex-col justify-center gap-6 px-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {valueLabel}
        </p>
        <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
          {formatChartCurrency(total, currency)}
        </p>
        {latest && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Latest ({latest.label}): {formatChartCurrency(latest.value, currency)}
          </p>
        )}
      </div>
      {change !== null && (
        <p
          className={
            change >= 0 ? "text-sm font-medium text-[var(--success)]" : "text-sm font-medium text-[var(--destructive)]"
          }
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% vs previous period
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.slice(-3).map((point) => (
          <div
            key={point.label}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 px-3 py-2"
          >
            <p className="text-[10px] text-[var(--muted)]">{point.label}</p>
            <p className="text-sm font-semibold tabular-nums">{formatChartCurrency(point.value, currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
