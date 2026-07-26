/**
 * Module-level sidebar scroll persistence.
 * Survives client-side navigations and panel remounts without remounting the shell.
 */

export type SidebarScrollVariant = "desktop" | "mobile";

const scrollTops: Record<SidebarScrollVariant, number> = {
  desktop: 0,
  mobile: 0,
};

export function getSidebarScrollTop(variant: SidebarScrollVariant): number {
  return scrollTops[variant];
}

export function setSidebarScrollTop(variant: SidebarScrollVariant, top: number): void {
  scrollTops[variant] = Math.max(0, top);
}

/** Restore saved scrollTop; clamp if content is shorter than before. */
export function restoreSidebarScrollTop(
  el: HTMLElement,
  variant: SidebarScrollVariant
): void {
  const max = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTop = Math.min(getSidebarScrollTop(variant), max);
}

/**
 * If the active leaf is outside the scrollport, nudge by the minimal amount
 * (nearest). Never forces scroll to top.
 */
export function ensureActiveNavVisible(container: HTMLElement): void {
  const active = container.querySelector<HTMLElement>("[aria-current='page']");
  if (!active) return;

  const cRect = container.getBoundingClientRect();
  const aRect = active.getBoundingClientRect();
  const pad = 8;

  if (aRect.top < cRect.top + pad) {
    container.scrollTop -= cRect.top + pad - aRect.top;
  } else if (aRect.bottom > cRect.bottom - pad) {
    container.scrollTop += aRect.bottom - (cRect.bottom - pad);
  }

  setSidebarScrollTop(
    container.dataset.sidebarScroll === "mobile" ? "mobile" : "desktop",
    container.scrollTop
  );
}
