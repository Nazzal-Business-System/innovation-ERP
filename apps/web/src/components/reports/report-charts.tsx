"use client";

import { useMemo, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint } from "@ierp/shared";
import { useChartTheme, formatChartCurrency } from "@/components/dashboard/charts/chart-theme";
import {
  categoryAxisWidth,
  categoryTickFontSize,
  categoryTickMaxChars,
  chartDensityFromWidth,
  chartHeightForBars,
  formatChartCount,
  formatChartDateTick,
  getCategoryChartMargins,
  shouldUseHorizontalCategoryBars,
  timeSeriesTickInterval,
  truncateChartLabel,
  useContainerWidth,
  yAxisWidthForCurrency,
} from "@/lib/charts/chart-axis";

function ChartEmpty({ height, message = "No chart data" }: { height: number; message?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--muted)]"
      style={{ height }}
      role="status"
    >
      {message}
    </div>
  );
}

function CategoryTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  fill: string;
  fontSize: number;
  maxChars: number;
  textAnchor?: "start" | "middle" | "end";
}) {
  const { x = 0, y = 0, payload, fill, fontSize, maxChars, textAnchor = "middle" } = props;
  const full = String(payload?.value ?? "");
  const display = truncateChartLabel(full, maxChars);
  return (
    <text
      x={x}
      y={y}
      dy={textAnchor === "middle" ? 12 : 4}
      fill={fill}
      fontSize={fontSize}
      textAnchor={textAnchor}
    >
      <title>{full}</title>
      {display}
    </text>
  );
}

interface SalesTrendChartProps {
  data: ChartDataPoint[];
  currency?: string;
}

export function SalesTrendChart({ data, currency = "JOD" }: SalesTrendChartProps) {
  const { colors, tooltipStyle } = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const density = chartDensityFromWidth(width);
  const height = 280;

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.foreground, fontSize: categoryTickFontSize(density) }}
            tickFormatter={formatChartDateTick}
            axisLine={false}
            tickLine={false}
            interval={timeSeriesTickInterval(data.length, density)}
            minTickGap={density === "dense" ? 8 : 16}
          />
          <YAxis
            tick={{ fill: colors.foreground, fontSize: categoryTickFontSize(density) }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatChartCurrency(v as number, currency)}
            width={yAxisWidthForCurrency(density)}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(label) => String(label)}
            formatter={(value) => [formatChartCurrency(value as number, currency), "Sales"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={2}
            dot={{ fill: colors.accent, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: colors.highlight }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DualTrendChartProps {
  data: ChartDataPoint[];
  currency?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export function DualTrendChart({
  data,
  currency = "JOD",
  primaryLabel = "Revenue",
  secondaryLabel = "Expenses",
}: DualTrendChartProps) {
  const { colors, tooltipStyle } = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const density = chartDensityFromWidth(width);
  const height = 280;

  if (!data.length) return <ChartEmpty height={height} />;

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.foreground, fontSize: categoryTickFontSize(density) }}
            tickFormatter={formatChartDateTick}
            axisLine={false}
            tickLine={false}
            interval={timeSeriesTickInterval(data.length, density)}
            minTickGap={density === "dense" ? 8 : 16}
          />
          <YAxis
            tick={{ fill: colors.foreground, fontSize: categoryTickFontSize(density) }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatChartCurrency(v as number, currency)}
            width={yAxisWidthForCurrency(density)}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(label) => String(label)}
            formatter={(value, name) => [
              formatChartCurrency(value as number, currency),
              name === "value" ? primaryLabel : secondaryLabel,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: colors.foreground, paddingTop: 4 }}
            formatter={(value) => (value === "value" ? primaryLabel : secondaryLabel)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="secondary"
            stroke={colors.highlight}
            strokeWidth={2}
            dot={{ r: 3, fill: colors.highlight, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StatusBarChartProps {
  data: Array<{ label: string; count: number }>;
  valueLabel?: string;
}

export function StatusBarChart({ data, valueLabel = "Count" }: StatusBarChartProps) {
  const { colors, tooltipStyle } = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const density = chartDensityFromWidth(width);

  const labels = useMemo(() => data.map((d) => d.label), [data]);
  const horizontalBars = shouldUseHorizontalCategoryBars({ labels, containerWidth: width });
  const margins = getCategoryChartMargins({ horizontalBars, density });
  const fontSize = categoryTickFontSize(density);
  const maxChars = categoryTickMaxChars(density, horizontalBars);
  const height = chartHeightForBars({ horizontalBars, categoryCount: data.length });
  const yWidth = categoryAxisWidth({ labels, density, horizontalBars });

  if (!data.length) return <ChartEmpty height={260} />;

  if (horizontalBars) {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={margins}>
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: colors.foreground, fontSize }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatChartCount(v as number)}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={yWidth}
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={<CategoryTick fill={colors.foreground} fontSize={fontSize} maxChars={maxChars} textAnchor="end" />}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(label) => String(label)}
              formatter={(value) => [value, valueLabel]}
            />
            <Bar dataKey="count" fill={colors.accent} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margins}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={<CategoryTick fill={colors.foreground} fontSize={fontSize} maxChars={maxChars} />}
            height={36}
          />
          <YAxis
            tick={{ fill: colors.foreground, fontSize }}
            axisLine={false}
            tickLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v) => formatChartCount(v as number)}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(label) => String(label)}
            formatter={(value) => [value, valueLabel]}
          />
          <Bar dataKey="count" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ValueBarChartProps {
  data: Array<{ label: string; value: number }>;
  currency?: string;
  valueLabel?: string;
}

export function ValueBarChart({
  data,
  currency = "JOD",
  valueLabel = "Value",
}: ValueBarChartProps) {
  const { colors, tooltipStyle } = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const density = chartDensityFromWidth(width);

  const labels = useMemo(() => data.map((d) => d.label), [data]);
  const horizontalBars = shouldUseHorizontalCategoryBars({ labels, containerWidth: width });
  const margins = getCategoryChartMargins({ horizontalBars, density });
  const fontSize = categoryTickFontSize(density);
  const maxChars = categoryTickMaxChars(density, horizontalBars);
  const height = chartHeightForBars({ horizontalBars, categoryCount: data.length });
  const yWidth = categoryAxisWidth({ labels, density, horizontalBars });

  if (!data.length) return <ChartEmpty height={260} />;

  if (horizontalBars) {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={margins}>
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: colors.foreground, fontSize }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatChartCurrency(v as number, currency)}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={yWidth}
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={<CategoryTick fill={colors.foreground} fontSize={fontSize} maxChars={maxChars} textAnchor="end" />}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(label) => String(label)}
              formatter={(value) => [formatChartCurrency(value as number, currency), valueLabel]}
            />
            <Bar dataKey="value" fill={colors.highlight} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={margins}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={<CategoryTick fill={colors.foreground} fontSize={fontSize} maxChars={maxChars} />}
            height={36}
          />
          <YAxis
            tick={{ fill: colors.foreground, fontSize }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatChartCurrency(v as number, currency)}
            width={yAxisWidthForCurrency(density)}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(label) => String(label)}
            formatter={(value) => [formatChartCurrency(value as number, currency), valueLabel]}
          />
          <Bar dataKey="value" fill={colors.highlight} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
