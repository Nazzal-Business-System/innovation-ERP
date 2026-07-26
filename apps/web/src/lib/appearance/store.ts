"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  type AccentColor,
  type AppearanceSettings,
  type BorderRadius,
  type CalendarStyle,
  type Density,
  type DetailsPageLayout,
  type ThemeMode,
} from "@/lib/i18n/types";
import { normalizeDetailsPageLayout } from "@/lib/entity-workspace/layout";

interface AppearanceStore extends AppearanceSettings {
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setDensity: (density: Density) => void;
  setRadius: (radius: BorderRadius) => void;
  setCalendarStyle: (calendarStyle: CalendarStyle) => void;
  setDetailsPageLayout: (detailsPageLayout: DetailsPageLayout) => void;
  reset: () => void;
}

export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      ...DEFAULT_APPEARANCE,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setRadius: (radius) => set({ radius }),
      setCalendarStyle: (calendarStyle) => set({ calendarStyle }),
      setDetailsPageLayout: (detailsPageLayout) =>
        set({ detailsPageLayout: normalizeDetailsPageLayout(detailsPageLayout) }),
      reset: () => set({ ...DEFAULT_APPEARANCE }),
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      merge: (persisted, current) => {
        const partial = (persisted ?? {}) as Partial<AppearanceSettings>;
        return {
          ...current,
          ...partial,
          calendarStyle: partial.calendarStyle ?? DEFAULT_APPEARANCE.calendarStyle,
          detailsPageLayout: normalizeDetailsPageLayout(
            partial.detailsPageLayout ?? DEFAULT_APPEARANCE.detailsPageLayout
          ),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const layout = normalizeDetailsPageLayout(state.detailsPageLayout);
          if (layout !== state.detailsPageLayout) {
            state.detailsPageLayout = layout;
          }
          applyAppearance(state);
        }
      },
    }
  )
);

function resolveTheme(theme: ThemeMode): "dark" | "light" {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
    return "dark";
  }
  return theme;
}

export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = resolveTheme(settings.theme);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-accent", settings.accent);
  root.setAttribute("data-density", settings.density);
  root.setAttribute("data-radius", settings.radius);
  root.setAttribute("data-calendar-style", settings.calendarStyle);
  root.setAttribute(
    "data-details-layout",
    normalizeDetailsPageLayout(settings.detailsPageLayout)
  );
}
