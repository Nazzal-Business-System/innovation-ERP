"use client";

import { useEffect } from "react";

const HIDE_STYLE_ID = "ierp-hide-next-dev-badge";

/** Dev-only: hide Next.js floating issue badge inside shadow DOM. */
export function HideNextDevBadge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    function injectHideStyle(shadowRoot: ShadowRoot) {
      if (shadowRoot.getElementById(HIDE_STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = HIDE_STYLE_ID;
      style.textContent = `
        :host,
        nextjs-dev-tools-indicator,
        [data-nextjs-dev-tools-indicator],
        [data-nextjs-dev-tools-button],
        button[aria-label="Open issues overlay"],
        button[aria-label="Collapse issues badge"],
        .dev-tools-indicator-menu,
        .dev-tools-indicator-inner {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
      `;
      shadowRoot.appendChild(style);
    }

    function hidePortalHosts() {
      document.querySelectorAll("nextjs-portal, nextjs-dev-tools-indicator").forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("pointer-events", "none", "important");
        }
        if (el.shadowRoot) injectHideStyle(el.shadowRoot);
      });
    }

    hidePortalHosts();
    const observer = new MutationObserver(hidePortalHosts);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
