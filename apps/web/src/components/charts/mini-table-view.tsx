"use client";

import type { ChartDataPoint } from "@ierp/shared";
import { formatChartCurrency } from "@/components/dashboard/charts/chart-theme";

interface MiniTableViewProps {
  data: ChartDataPoint[];
  currency?: string;
  valueLabel?: string;
  secondaryLabel?: string;
}

export function MiniTableView({
  data,
  currency = "JOD",
  valueLabel = "Value",
  secondaryLabel = "Secondary",
}: MiniTableViewProps) {
  const hasSecondary = data.some((d) => d.secondary !== undefined);

  return (
    <div className="max-h-[260px] overflow-auto rounded-lg border border-[var(--border-subtle)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-[var(--muted-bg)]/80 backdrop-blur-sm">
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="px-3 py-2 text-start text-xs font-medium text-[var(--muted)]">Label</th>
            <th className="px-3 py-2 text-end text-xs font-medium text-[var(--muted)]">{valueLabel}</th>
            {hasSecondary && (
              <th className="px-3 py-2 text-end text-xs font-medium text-[var(--muted)]">{secondaryLabel}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.label} className="border-b border-[var(--border-subtle)] last:border-0">
              <td className="px-3 py-2 font-medium text-[var(--foreground)]">{row.label}</td>
              <td className="px-3 py-2 text-end tabular-nums text-[var(--foreground)]">
                {formatChartCurrency(row.value, currency)}
              </td>
              {hasSecondary && (
                <td className="px-3 py-2 text-end tabular-nums text-[var(--muted)]">
                  {row.secondary !== undefined ? formatChartCurrency(row.secondary, currency) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
