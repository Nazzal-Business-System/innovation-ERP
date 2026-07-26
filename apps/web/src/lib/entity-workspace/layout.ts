import type { DetailsPageLayout } from "../i18n/types";

export const DETAILS_PAGE_LAYOUTS: readonly DetailsPageLayout[] = [
  "workspace",
  "executive",
  "compact",
  "focus",
] as const;

export const DEFAULT_DETAILS_PAGE_LAYOUT: DetailsPageLayout = "workspace";

/** Coerce unknown persisted values to a valid layout (fallback: workspace). */
export function normalizeDetailsPageLayout(value: unknown): DetailsPageLayout {
  if (typeof value === "string" && (DETAILS_PAGE_LAYOUTS as readonly string[]).includes(value)) {
    return value as DetailsPageLayout;
  }
  return DEFAULT_DETAILS_PAGE_LAYOUT;
}
