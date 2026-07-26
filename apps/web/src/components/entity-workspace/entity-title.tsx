"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EntityTitle({
  title,
  subtitle,
  className,
  trailing,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="ew-title text-[var(--foreground)]">{title}</h1>
        {subtitle ? <p className="ew-subtitle mt-1">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
