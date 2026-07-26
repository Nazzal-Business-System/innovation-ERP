"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { DetailsPageLayout } from "@/lib/i18n/types";
import { normalizeDetailsPageLayout } from "@/lib/entity-workspace/layout";
import { useAppearanceStore } from "@/lib/appearance/store";

type EntityLayoutContextValue = {
  layout: DetailsPageLayout;
  /** Prefer collapsing Focus sections by default */
  preferCollapsedSections: boolean;
  showSidebar: boolean;
};

const EntityLayoutContext = createContext<EntityLayoutContextValue | null>(null);

export function EntityLayoutProvider({
  layout: layoutOverride,
  children,
}: {
  layout?: DetailsPageLayout;
  children: ReactNode;
}) {
  const stored = useAppearanceStore((s) => s.detailsPageLayout);
  const layout = normalizeDetailsPageLayout(layoutOverride ?? stored);

  const value = useMemo<EntityLayoutContextValue>(
    () => ({
      layout,
      preferCollapsedSections: layout === "focus",
      showSidebar: layout === "workspace" || layout === "compact",
    }),
    [layout]
  );

  return (
    <EntityLayoutContext.Provider value={value}>{children}</EntityLayoutContext.Provider>
  );
}

export function useEntityLayout() {
  const ctx = useContext(EntityLayoutContext);
  if (!ctx) {
    return {
      layout: "workspace" as DetailsPageLayout,
      preferCollapsedSections: false,
      showSidebar: true,
    };
  }
  return ctx;
}
