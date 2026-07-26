"use client";

import { useEffect, useState } from "react";
import { applyAppearance, useAppearanceStore } from "./store";

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppearanceStore((s) => s.theme);
  const accent = useAppearanceStore((s) => s.accent);
  const density = useAppearanceStore((s) => s.density);
  const radius = useAppearanceStore((s) => s.radius);
  const calendarStyle = useAppearanceStore((s) => s.calendarStyle);
  const detailsPageLayout = useAppearanceStore((s) => s.detailsPageLayout);
  const [, setThemeTick] = useState(0);

  useEffect(() => {
    applyAppearance({ theme, accent, density, radius, calendarStyle, detailsPageLayout });

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      applyAppearance(useAppearanceStore.getState());
      setThemeTick((t) => t + 1);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent, density, radius, calendarStyle, detailsPageLayout]);

  return <>{children}</>;
}
