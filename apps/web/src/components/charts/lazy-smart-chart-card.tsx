"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const SmartChartCardInner = dynamic(
  () => import("@/components/charts/smart-chart-card").then((m) => ({ default: m.SmartChartCard })),
  {
    loading: () => (
      <div className="h-72 rounded-[var(--radius-lg)] bg-[var(--muted-bg)] ierp-skeleton-shimmer" />
    ),
  }
);

export function LazySmartChartCard(props: ComponentProps<typeof SmartChartCardInner>) {
  return <SmartChartCardInner {...props} />;
}
