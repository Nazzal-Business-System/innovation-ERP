import { NAV_GROUPS } from "../constants/index";
import type { GlobalSearchResult } from "../types/search";
import { scoreSearchFields } from "./search-ranking";

export type NavAccessFn = (itemId: string) => boolean;
export type NavLabelFn = (itemId: string, groupId?: string) => string;

type ExtraNav = {
  id: string;
  href: string;
  groupLabel: string;
  keywords: string[];
  include: boolean;
};

/**
 * Permission-aware navigation search over the sidebar catalog.
 * Active/collapsed sidebar state does not affect results.
 */
export function searchNavigationCatalog(options: {
  query: string;
  resolveLabel: NavLabelFn;
  canAccessItem: NavAccessFn;
  extras?: ExtraNav[];
  limit?: number;
}): GlobalSearchResult[] {
  const q = options.query.trim();
  if (!q) return [];
  const limit = options.limit ?? 12;
  const results: GlobalSearchResult[] = [];

  for (const group of NAV_GROUPS) {
    const groupLabel = options.resolveLabel(group.id, group.id);
    for (const item of group.items) {
      if (!options.canAccessItem(item.id)) continue;

      const label = options.resolveLabel(item.id);
      const hrefTail = item.href.replace(/^\/dashboard\/?/, "").replace(/\//g, " ");
      const scored = scoreSearchFields(q, [
        { field: "label", value: label, kind: "title" },
        { field: "group", value: groupLabel, kind: "related" },
        { field: "id", value: item.id.replace(/-/g, " "), kind: "related" },
        { field: "path", value: hrefTail, kind: "related" },
        { field: "labelKey", value: item.labelKey, kind: "related" },
      ]);
      if (scored.score <= 0) continue;

      results.push({
        id: `nav:${item.id}`,
        kind: "navigation",
        entityType: "nav_item",
        type: "nav_item",
        module: "NAVIGATION",
        title: label,
        subtitle: groupLabel,
        route: item.href,
        score: scored.score + 8,
        matchedField: scored.matchedField,
        matchedSnippet: scored.matchedSnippet,
        iconKey: "nav_item",
        metadata: { navItemId: item.id, groupId: group.id },
      });
    }
  }

  for (const extra of options.extras ?? []) {
    if (!extra.include) continue;
    const label = options.resolveLabel(extra.id);
    const scored = scoreSearchFields(q, [
      { field: "label", value: label, kind: "title" },
      { field: "group", value: extra.groupLabel, kind: "related" },
      ...extra.keywords.map((kw) => ({
        field: "keyword",
        value: kw,
        kind: "related" as const,
      })),
    ]);
    if (scored.score <= 0) continue;
    results.push({
      id: `nav:${extra.id}`,
      kind: "navigation",
      entityType: "nav_item",
      type: "nav_item",
      module: "NAVIGATION",
      title: label,
      subtitle: extra.groupLabel,
      route: extra.href,
      score: scored.score + 8,
      matchedField: scored.matchedField,
      matchedSnippet: scored.matchedSnippet,
      iconKey: "nav_item",
      metadata: { navItemId: extra.id },
    });
  }

  const byRoute = new Map<string, GlobalSearchResult>();
  for (const r of results.sort((a, b) => b.score - a.score)) {
    if (!byRoute.has(r.route)) byRoute.set(r.route, r);
  }

  return [...byRoute.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
