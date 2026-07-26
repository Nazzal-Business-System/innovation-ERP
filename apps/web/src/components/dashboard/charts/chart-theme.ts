"use client";

import { useAppearanceStore } from "@/lib/appearance/store";

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Theme-aware chart colors — re-reads CSS variables when appearance changes. */
export function useChartTheme() {
  const theme = useAppearanceStore((s) => s.theme);
  const accent = useAppearanceStore((s) => s.accent);

  const colors = {
    accent: cssVar("--accent", "#818cf8"),
    accentSoft: cssVar("--accent-muted", "rgba(99, 102, 241, 0.25)"),
    highlight: cssVar("--highlight", "#22d3ee"),
    highlightSoft: cssVar("--highlight-muted", "rgba(34, 211, 238, 0.2)"),
    muted: cssVar("--muted", "#64748b"),
    grid: cssVar("--border-subtle", "rgba(148, 163, 184, 0.08)"),
    foreground: cssVar("--muted-foreground", "#64748b"),
    tooltipBg: cssVar("--card", "#0c1222"),
    tooltipBorder: cssVar("--border", "rgba(148, 163, 184, 0.14)"),
  };

  const tooltipStyle = {
    contentStyle: {
      background: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: "0.5rem",
      fontSize: "12px",
      color: cssVar("--card-foreground", "#f1f5f9"),
    },
    labelStyle: { color: cssVar("--muted-foreground", "#94a3b8") },
    itemStyle: { color: cssVar("--foreground", "#f8fafc") },
  };

  // Subscribe to appearance store so charts re-render when theme/accent changes.
  void theme;
  void accent;

  return { colors, tooltipStyle };
}

export function formatChartCurrency(value: number, currency = "JOD"): string {
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(0)}K`;
  return `${currency} ${value.toLocaleString()}`;
}

/** @deprecated Use useChartTheme() for theme-aware colors. */
export const CHART_COLORS = {
  accent: "#818cf8",
  accentSoft: "rgba(99, 102, 241, 0.25)",
  highlight: "#22d3ee",
  highlightSoft: "rgba(34, 211, 238, 0.2)",
  muted: "#64748b",
  grid: "rgba(148, 163, 184, 0.08)",
  foreground: "#94a3b8",
  tooltipBg: "#0c1222",
  tooltipBorder: "rgba(148, 163, 184, 0.14)",
} as const;

/** @deprecated Use useChartTheme() for theme-aware tooltips. */
export const chartTooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    fontSize: "12px",
    color: "var(--card-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "var(--foreground)" },
};
