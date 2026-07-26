/** PARTIALLY_RECEIVED → Partially received; READY_TO_SHIP → Ready to ship */
export function humanizeEnumLabel(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  if (!/[_-]/.test(raw) && raw !== raw.toUpperCase()) return raw;

  const words = raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

  return words
    .map((word, index) => {
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join(" ");
}

export function resolveChartLabel(
  value: string,
  labelMap?: Record<string, string>
): string {
  if (labelMap && value in labelMap) return labelMap[value]!;
  return humanizeEnumLabel(value);
}

/** Truncate for axis ticks; full string stays available via tooltip. */
export function truncateChartLabel(label: string, maxChars: number): string {
  const trimmed = label.trim();
  if (maxChars < 2 || trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function formatChartCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export function formatChartPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

/** Month labels like 2026-03 or Mar 2026 → compact tick. */
export function formatChartDateTick(label: string): string {
  const isoMonth = /^(\d{4})-(\d{2})$/.exec(label.trim());
  if (isoMonth) {
    const date = new Date(Number(isoMonth[1]), Number(isoMonth[2]) - 1, 1);
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const parsed = Date.parse(label);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return truncateChartLabel(label, 12);
}

export type ChartAxisDensity = "comfortable" | "compact" | "dense";

export function chartDensityFromWidth(width: number): ChartAxisDensity {
  if (width > 0 && width < 420) return "dense";
  if (width > 0 && width < 720) return "compact";
  return "comfortable";
}

export function categoryTickMaxChars(density: ChartAxisDensity, horizontalBars: boolean): number {
  if (horizontalBars) {
    if (density === "dense") return 10;
    if (density === "compact") return 14;
    return 18;
  }
  if (density === "dense") return 6;
  if (density === "compact") return 9;
  return 12;
}

export function categoryTickFontSize(density: ChartAxisDensity): number {
  if (density === "dense") return 9;
  if (density === "compact") return 10;
  return 11;
}

/**
 * Prefer horizontal bars when category labels are long or the viewport is narrow.
 * Never rotate/slant labels for small category sets.
 */
export function shouldUseHorizontalCategoryBars(opts: {
  labels: string[];
  containerWidth: number;
  forceVerticalBars?: boolean;
}): boolean {
  const { labels, containerWidth, forceVerticalBars } = opts;
  if (forceVerticalBars) return false;
  if (labels.length === 0) return false;
  if (containerWidth > 0 && containerWidth < 520) return true;
  const longest = labels.reduce((max, l) => Math.max(max, l.length), 0);
  if (longest > 14) return true;
  if (labels.length >= 7 && longest > 10) return true;
  return false;
}

export function getCategoryChartMargins(opts: {
  horizontalBars: boolean;
  density: ChartAxisDensity;
}): { top: number; right: number; left: number; bottom: number } {
  const { horizontalBars, density } = opts;
  if (horizontalBars) {
    return {
      top: 8,
      right: density === "dense" ? 8 : 12,
      left: 4,
      bottom: 4,
    };
  }
  return {
    top: 8,
    right: 8,
    left: 0,
    bottom: density === "dense" ? 8 : 12,
  };
}

export function categoryAxisWidth(opts: {
  labels: string[];
  density: ChartAxisDensity;
  horizontalBars: boolean;
}): number {
  const maxChars = categoryTickMaxChars(opts.density, opts.horizontalBars);
  const longest = opts.labels.reduce(
    (max, l) => Math.max(max, Math.min(l.length, maxChars + 1)),
    4
  );
  const approx = longest * (opts.density === "dense" ? 6.5 : 7.2) + 12;
  if (opts.horizontalBars) return Math.min(140, Math.max(72, approx));
  return 0;
}

export function yAxisWidthForCurrency(density: ChartAxisDensity): number {
  if (density === "dense") return 56;
  if (density === "compact") return 64;
  return 72;
}

export function timeSeriesTickInterval(
  pointCount: number,
  density: ChartAxisDensity
): number | "preserveStartEnd" {
  if (pointCount <= 4) return 0;
  if (density === "dense") return Math.max(0, Math.ceil(pointCount / 3) - 1);
  if (density === "compact") return Math.max(0, Math.ceil(pointCount / 5) - 1);
  return "preserveStartEnd";
}

export function chartHeightForBars(opts: {
  horizontalBars: boolean;
  categoryCount: number;
  base?: number;
}): number {
  const base = opts.base ?? 260;
  if (!opts.horizontalBars) return base;
  return Math.min(420, Math.max(base, opts.categoryCount * 36 + 48));
}
