"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export * from "./chart-axis-utils";

export function useContainerWidth(ref: RefObject<HTMLElement | null>, fallback = 720): number {
  const [width, setWidth] = useState(fallback);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const next = node.clientWidth;
    if (next > 0) setWidth(next);
  }, [ref]);

  useEffect(() => {
    measure();
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    return () => ro.disconnect();
  }, [measure, ref]);

  return width;
}
