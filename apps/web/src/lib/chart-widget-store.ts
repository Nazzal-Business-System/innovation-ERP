"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChartVisualizationType } from "@/components/charts/chart-types";

const STORAGE_KEY = "ierp_chart_widgets";

interface ChartWidgetStore {
  types: Record<string, ChartVisualizationType>;
  getType: (widgetId: string, fallback: ChartVisualizationType) => ChartVisualizationType;
  setType: (widgetId: string, type: ChartVisualizationType) => void;
}

export const useChartWidgetStore = create<ChartWidgetStore>()(
  persist(
    (set, get) => ({
      types: {},
      getType: (widgetId, fallback) => get().types[widgetId] ?? fallback,
      setType: (widgetId, type) =>
        set((s) => ({ types: { ...s.types, [widgetId]: type } })),
    }),
    { name: STORAGE_KEY }
  )
);
