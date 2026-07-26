import { searchNavigationCatalog, type GlobalSearchResult } from "@ierp/shared";
import { canAccessNavItem, canAccessSettings } from "@/lib/nav-permissions";

export type NavLabelResolver = (itemId: string, groupId?: string) => string;

/**
 * Build permission-aware navigation results from the real sidebar catalog.
 */
export function searchNavigation(options: {
  query: string;
  permissions: string[];
  resolveLabel: NavLabelResolver;
  limit?: number;
}): GlobalSearchResult[] {
  return searchNavigationCatalog({
    query: options.query,
    resolveLabel: options.resolveLabel,
    canAccessItem: (itemId) => canAccessNavItem(itemId, options.permissions),
    limit: options.limit,
    extras: [
      {
        id: "settings",
        href: "/dashboard/settings",
        groupLabel: "Settings",
        keywords: ["settings", "preferences", "organization", "roles", "users"],
        include: canAccessSettings(options.permissions),
      },
      {
        id: "profile",
        href: "/dashboard/profile",
        groupLabel: "Settings",
        keywords: ["profile", "password", "avatar", "account"],
        include: true,
      },
    ],
  });
}
