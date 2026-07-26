"use client";

import dynamic from "next/dynamic";

export const StatusBarChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.StatusBarChart })),
  { loading: () => <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--muted-bg)] ierp-skeleton-shimmer" /> }
);

export const ValueBarChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.ValueBarChart })),
  { loading: () => <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--muted-bg)] ierp-skeleton-shimmer" /> }
);

export const DualTrendChart = dynamic(
  () => import("@/components/reports/report-charts").then((m) => ({ default: m.DualTrendChart })),
  { loading: () => <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--muted-bg)] ierp-skeleton-shimmer" /> }
);
