"use client";

import type { ReactNode } from "react";
import { EntitySection } from "./entity-section";
import { cn } from "@/lib/utils";

export function EntityTableSection({
  id = "table",
  title,
  description,
  children,
  actions,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <EntitySection
      id={id}
      title={title}
      description={description}
      actions={actions}
      className={className}
    >
      <div className={cn("ew-table-scroll rounded-lg border border-[var(--border-subtle)]")}>
        {children}
      </div>
    </EntitySection>
  );
}
