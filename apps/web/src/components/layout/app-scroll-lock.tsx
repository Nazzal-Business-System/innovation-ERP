"use client";

import { useEffect } from "react";

const SHELL_SCROLL_LOCK_CLASS = "ierp-app-shell-active";

let lockCount = 0;

/**
 * Locks html/body scrolling while the dashboard AppShell (or its skeleton) is mounted.
 * Main content scrolls only via `.ierp-main-content` (Approach B).
 * Portals/login are unaffected because they never mount this lock.
 *
 * Ref-counted so AuthGate skeleton → AppShell transitions do not briefly unlock.
 */
export function AppScrollLock() {
  useEffect(() => {
    const root = document.documentElement;
    lockCount += 1;
    root.classList.add(SHELL_SCROLL_LOCK_CLASS);
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        root.classList.remove(SHELL_SCROLL_LOCK_CLASS);
      }
    };
  }, []);

  return null;
}
