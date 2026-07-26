"use client";

import type { ReactNode } from "react";
import type { ChartDataPoint } from "@ierp/shared";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartWidgetStore } from "@/lib/chart-widget-store";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "./chart-renderer";
import { ChartTypeSelector } from "./chart-type-selector";
import type { ChartVisualizationType } from "./chart-types";

interface SmartChartCardProps {
  widgetId: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  data: ChartDataPoint[];
  currency?: string;
  defaultType?: ChartVisualizationType;
  valueLabel?: string;
  secondaryLabel?: string;
  className?: string;
  colSpan?: "default" | "wide" | "full";
  children?: ReactNode;
}

export function SmartChartCard({
  widgetId,
  title,
  description,
  icon: Icon,
  data,
  currency,
  defaultType = "area",
  valueLabel,
  secondaryLabel,
  className,
  colSpan = "default",
  children,
}: SmartChartCardProps) {
  const chartType = useChartWidgetStore((s) => s.types[widgetId] ?? defaultType);

  return (
    <Card
      className={cn(
        "overflow-hidden",
        colSpan === "wide" && "xl:col-span-2",
        colSpan === "full" && "xl:col-span-3",
        className
      )}
    >
      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-3 space-y-0 overflow-visible pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />}
            <span className="truncate">{title}</span>
          </CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        <ChartTypeSelector
          widgetId={widgetId}
          defaultType={defaultType}
          className="shrink-0"
        />
      </CardHeader>
      <CardContent className="min-w-0 overflow-hidden">
        {children ?? (
          <ChartRenderer
            type={chartType}
            data={data}
            currency={currency}
            valueLabel={valueLabel}
            secondaryLabel={secondaryLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}
