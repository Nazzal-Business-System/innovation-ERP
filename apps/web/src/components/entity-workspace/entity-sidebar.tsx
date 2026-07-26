"use client";

import type { ReactNode } from "react";
import { useEntityLayout } from "./context/entity-layout-context";
import { cn } from "@/lib/utils";

export function EntitySidebar({
  children,
  className,
  force,
}: {
  children: ReactNode;
  className?: string;
  /** Force render even in Focus/Executive (content still stacks). */
  force?: boolean;
}) {
  const { showSidebar, layout } = useEntityLayout();
  if (!force && !showSidebar && (layout === "focus" || layout === "executive")) {
    // Still render below main via CSS grid single column — keep in DOM for a11y when forced off visually?
    // Spec: fewer panels — hide sidebar content in focus/executive unless force.
    return null;
  }

  return (
    <aside
      className={cn("ew-sidebar", className)}
      aria-label="Supporting details"
    >
      {children}
    </aside>
  );
}
