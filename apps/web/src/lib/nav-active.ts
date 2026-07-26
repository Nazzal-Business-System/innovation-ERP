import { NAV_GROUPS } from "@ierp/shared";

export const PROFILE_HREF = "/dashboard/profile";
export const SETTINGS_HREF = "/dashboard/settings";
/** Employee self-service settings (pinned in sidebar footer for ESS users). */
export const EMPLOYEE_SETTINGS_HREF = "/dashboard/my-workspace/settings";

/**
 * Collect leaf nav hrefs from the shared NAV_GROUPS catalog (+ Settings footer).
 * Section headings are not included — they are never active.
 */
export function collectNavLeafHrefs(): string[] {
  const hrefs: string[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      hrefs.push(item.href);
    }
  }
  hrefs.push(SETTINGS_HREF);
  return hrefs;
}

const DEFAULT_NAV_HREFS = collectNavLeafHrefs();

/**
 * Whether `pathname` is covered by a nav leaf `href`.
 * `/dashboard` is exact-only so it never steals nested module routes.
 */
export function pathMatchesNavHref(pathname: string, href: string): boolean {
  if (!href || href === "#") return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Deterministic active leaf: the longest matching nav href wins.
 * Guarantees at most one leaf is active for any pathname.
 */
export function resolveActiveNavHref(
  pathname: string,
  hrefs: readonly string[] = DEFAULT_NAV_HREFS
): string | null {
  if (!pathname) return null;
  if (pathname === PROFILE_HREF || pathname.startsWith(`${PROFILE_HREF}/`)) {
    return null;
  }
  // Employee Settings is a footer control — do not activate a scrollable leaf for it.
  if (
    pathname === EMPLOYEE_SETTINGS_HREF ||
    pathname.startsWith(`${EMPLOYEE_SETTINGS_HREF}/`)
  ) {
    return null;
  }

  let best: string | null = null;
  for (const href of hrefs) {
    if (!pathMatchesNavHref(pathname, href)) continue;
    if (!best || href.length > best.length) {
      best = href;
    }
  }
  return best;
}

/** True when this leaf href is the single active nav item for `pathname`. */
export function isNavItemActive(
  href: string,
  pathname: string,
  hrefs: readonly string[] = DEFAULT_NAV_HREFS
): boolean {
  if (!href || href === "#") return false;
  return resolveActiveNavHref(pathname, hrefs) === href;
}
