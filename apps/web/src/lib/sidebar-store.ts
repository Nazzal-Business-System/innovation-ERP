"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarMode = "expanded" | "collapsed" | "auto";

const STORAGE_KEY = "ierp_sidebar_mode";

interface SidebarStore {
  mode: SidebarMode;
  autoHovered: boolean;
  setMode: (mode: SidebarMode) => void;
  setAutoHovered: (hovered: boolean) => void;
  isEffectivelyCollapsed: () => boolean;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      mode: "expanded",
      autoHovered: false,
      setMode: (mode) => set({ mode, autoHovered: false }),
      setAutoHovered: (autoHovered) => set({ autoHovered }),
      isEffectivelyCollapsed: () => {
        const { mode, autoHovered } = get();
        if (mode === "collapsed") return true;
        if (mode === "auto") return !autoHovered;
        return false;
      },
    }),
    { name: STORAGE_KEY, partialize: (s) => ({ mode: s.mode }) }
  )
);

export function useSidebarCollapsed(): boolean {
  const mode = useSidebarStore((s) => s.mode);
  const autoHovered = useSidebarStore((s) => s.autoHovered);
  if (mode === "collapsed") return true;
  if (mode === "auto") return !autoHovered;
  return false;
}
