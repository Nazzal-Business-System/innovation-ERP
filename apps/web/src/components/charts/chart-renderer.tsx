"use client";

import { useRef } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDataPoint } from "@ierp/shared";
import {
  useChartTheme,
  formatChartCurrency,
} from "@/components/dashboard/charts/chart-theme";
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
import type { ChartVisualizationType } from "./chart-types";
import { MetricTextView } from "./metric-text-view";
import { MiniTableView } from "./mini-table-view";

const PIE_COLORS = ["#818cf8", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#a78bfa"];

interface ChartRendererProps {
  type: ChartVisualizationType;
  data: ChartDataPoint[];
  currency?: string;
  valueLabel?: string;
  secondaryLabel?: string;
  height?: number;
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

export function ChartRenderer({
  type,
  data,
  currency = "JOD",
  valueLabel = "Value",
  secondaryLabel = "Secondary",
  height = 260,
}: ChartRendererProps) {
  const { colors, tooltipStyle } = useChartTheme();
  const ref = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(ref);
  const density = chartDensityFromWidth(width);
  const fontSize = categoryTickFontSize(density);

  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    secondary: d.secondary ?? 0,
  }));
  const labels = chartData.map((d) => d.name);

  if (type === "metric") {
    return <MetricTextView data={data} currency={currency} valueLabel={valueLabel} />;
  }

  if (type === "table") {
    return (
      <MiniTableView
        data={data}
        currency={currency}
        valueLabel={valueLabel}
        secondaryLabel={secondaryLabel}
      />
    );
  }

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-subtle)] text-sm text-[var(--muted)]"
        style={{ height }}
        role="status"
      >
        No chart data
      </div>
    );
  }

  const moneyYAxis = (
    <YAxis
      tick={{ fill: colors.foreground, fontSize }}
      axisLine={false}
      tickLine={false}
      tickFormatter={(v) => formatChartCurrency(v as number, currency)}
      width={yAxisWidthForCurrency(density)}
    />
  );

  const timeXAxis = (
    <XAxis
      dataKey="name"
      tick={{ fill: colors.foreground, fontSize }}
      tickFormatter={formatChartDateTick}
      axisLine={false}
      tickLine={false}
      interval={timeSeriesTickInterval(chartData.length, density)}
      minTickGap={density === "dense" ? 8 : 16}
    />
  );

  if (type === "pie" || type === "donut") {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => formatChartCurrency(value as number, currency)}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={type === "donut" ? "52%" : 0}
              outerRadius="72%"
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "radar") {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="68%">
            <PolarGrid stroke={colors.grid} />
            <PolarAngleAxis
              dataKey="name"
              tick={{ fill: colors.foreground, fontSize: 9 }}
              tickFormatter={(v) => truncateChartLabel(String(v), 10)}
            />
            <Radar dataKey="value" stroke={colors.accent} fill={colors.accent} fillOpacity={0.25} />
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => formatChartCurrency(value as number, currency)}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const preferHorizontal =
    type === "horizontalBar" ||
    shouldUseHorizontalCategoryBars({ labels, containerWidth: width });
  const barHeight = chartHeightForBars({
    horizontalBars: preferHorizontal && (type === "bar" || type === "horizontalBar"),
    categoryCount: chartData.length,
    base: height,
  });

  if (type === "horizontalBar" || (type === "bar" && preferHorizontal)) {
    const maxChars = categoryTickMaxChars(density, true);
    const yWidth = categoryAxisWidth({ labels, density, horizontalBars: true });
    const margins = getCategoryChartMargins({ horizontalBars: true, density });
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart data={chartData} layout="vertical" margin={margins}>
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: colors.foreground, fontSize }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                valueLabel.toLowerCase().includes("order") || valueLabel.toLowerCase().includes("count")
                  ? formatChartCount(v as number)
                  : formatChartCurrency(v as number, currency)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={yWidth}
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={
                <CategoryTick
                  fill={colors.foreground}
                  fontSize={fontSize}
                  maxChars={maxChars}
                  textAnchor="end"
                />
              }
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(label) => String(label)}
              formatter={(value) => [
                valueLabel.toLowerCase().includes("order") || valueLabel.toLowerCase().includes("count")
                  ? value
                  : formatChartCurrency(value as number, currency),
                valueLabel,
              ]}
            />
            <Bar dataKey="value" fill={colors.accent} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "bar") {
    const maxChars = categoryTickMaxChars(density, false);
    const margins = getCategoryChartMargins({ horizontalBars: false, density });
    const isCount =
      valueLabel.toLowerCase().includes("order") || valueLabel.toLowerCase().includes("count");
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={margins}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              interval={0}
              height={36}
              tick={<CategoryTick fill={colors.foreground} fontSize={fontSize} maxChars={maxChars} />}
            />
            <YAxis
              tick={{ fill: colors.foreground, fontSize }}
              axisLine={false}
              tickLine={false}
              width={isCount ? 40 : yAxisWidthForCurrency(density)}
              tickFormatter={(v) =>
                isCount ? formatChartCount(v as number) : formatChartCurrency(v as number, currency)
              }
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={(label) => String(label)}
              formatter={(value) => [
                isCount ? value : formatChartCurrency(value as number, currency),
                valueLabel,
              ]}
            />
            <Bar dataKey="value" fill={colors.accent} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "composed") {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            {timeXAxis}
            {moneyYAxis}
            <Tooltip
              {...tooltipStyle}
              formatter={(value, name) => [
                formatChartCurrency(value as number, currency),
                name === "secondary" ? secondaryLabel : valueLabel,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" fill={colors.accentSoft} radius={[4, 4, 0, 0]} name={valueLabel} />
            <Line
              type="monotone"
              dataKey="secondary"
              stroke={colors.highlight}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={secondaryLabel}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div ref={ref} className="w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            {timeXAxis}
            {moneyYAxis}
            <Tooltip
              {...tooltipStyle}
              formatter={(value) => formatChartCurrency(value as number, currency)}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.accent}
              strokeWidth={2}
              dot={{ fill: colors.accent, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // default: area
  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={`areaGrad-${widgetHash(data)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          {timeXAxis}
          {moneyYAxis}
          <Tooltip
            {...tooltipStyle}
            formatter={(value) => formatChartCurrency(value as number, currency)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={2}
            fill={`url(#areaGrad-${widgetHash(data)})`}
            dot={{ fill: colors.accent, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: colors.highlight }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function widgetHash(data: ChartDataPoint[]): string {
  return String(data.length) + (data[0]?.label ?? "");
}
