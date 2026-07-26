import type { ChartDataPoint } from "@ierp/shared";

export function toChartPoints(
  items: Array<{ label: string; value?: number; count?: number; secondary?: number }>
): ChartDataPoint[] {
  return items.map((item) => ({
    label: item.label,
    value: item.value ?? item.count ?? 0,
    secondary: item.secondary,
  }));
}
