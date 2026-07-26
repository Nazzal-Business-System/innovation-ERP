"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EntityBreadcrumbs } from "./entity-breadcrumbs";
import type { EntityBreadcrumbItem } from "@/lib/entity-workspace/types";

export function EntityHeader({
  breadcrumbs,
  children,
  className,
}: {
  breadcrumbs?: EntityBreadcrumbItem[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("ew-header", className)}>
      {breadcrumbs ? <EntityBreadcrumbs items={breadcrumbs} /> : null}
      {children}
    </header>
  );
}
