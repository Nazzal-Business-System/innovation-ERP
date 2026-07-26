"use client";

import type { EntityMetricItem } from "@/lib/entity-workspace/types";
import { useEntityLayout } from "./context/entity-layout-context";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EntityMetrics({
  items,
  className,
  collapsible,
}: {
  items: EntityMetricItem[];
  className?: string;
  /** Override Focus collapse behavior */
  collapsible?: boolean;
}) {
  const { layout } = useEntityLayout();
  const { t } = useI18n();
  const canCollapse = collapsible ?? (layout === "focus" || layout === "executive");
  const [collapsed, setCollapsed] = useState(layout === "focus");

  if (!items.length) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {canCollapse ? (
        <div className="mb-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            {collapsed ? t("entityWorkspace.showMetrics") : t("entityWorkspace.hideMetrics")}
          </Button>
        </div>
      ) : null}
      <div
        className="ew-metrics"
        data-collapsed={canCollapse && collapsed ? "true" : "false"}
        role="group"
        aria-label={t("entityWorkspace.metrics")}
      >
        {items.map((item) => (
          <div key={item.id} className="ew-metric">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {item.label}
            </p>
            <p className="ew-metric-value mt-1 text-[var(--foreground)]">{item.value}</p>
            {item.hint ? <p className="mt-1 text-xs text-[var(--muted)]">{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
