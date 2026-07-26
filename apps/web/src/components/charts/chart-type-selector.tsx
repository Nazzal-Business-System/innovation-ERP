"use client";

import { BarChart3, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useChartWidgetStore } from "@/lib/chart-widget-store";
import { cn } from "@/lib/utils";
import {
  CHART_TYPE_LABEL_KEYS,
  CHART_VISUALIZATION_TYPES,
  type ChartVisualizationType,
} from "./chart-types";

interface ChartTypeSelectorProps {
  widgetId: string;
  defaultType?: ChartVisualizationType;
  className?: string;
}

export function ChartTypeSelector({
  widgetId,
  defaultType = "area",
  className,
}: ChartTypeSelectorProps) {
  const { t } = useI18n();
  const current = useChartWidgetStore((s) => s.types[widgetId] ?? defaultType);
  const setType = useChartWidgetStore((s) => s.setType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative z-10 h-8 cursor-pointer gap-1.5 border-[var(--border-subtle)] bg-[var(--background)] px-2.5 text-xs font-medium",
            className
          )}
          aria-label={t("charts.selectType")}
        >
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
          <span className="max-w-[6rem] truncate">{t(CHART_TYPE_LABEL_KEYS[current])}</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200] max-h-72 w-48 overflow-y-auto">
        {CHART_VISUALIZATION_TYPES.map((type) => {
          const selected = current === type;
          return (
            <DropdownMenuItem
              key={type}
              className={cn(
                "cursor-pointer gap-2 text-xs",
                selected && "bg-[var(--accent-muted)] font-medium text-[var(--accent)]"
              )}
              onSelect={(e) => {
                e.preventDefault();
                setType(widgetId, type);
              }}
            >
              <Check
                className={cn("h-3.5 w-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                aria-hidden
              />
              {t(CHART_TYPE_LABEL_KEYS[type])}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
