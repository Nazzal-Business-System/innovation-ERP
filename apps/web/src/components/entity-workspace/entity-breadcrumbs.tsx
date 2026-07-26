"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { EntityBreadcrumbItem } from "@/lib/entity-workspace/types";
import { cn } from "@/lib/utils";

export function EntityBreadcrumbs({
  items,
  className,
}: {
  items: EntityBreadcrumbItem[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 opacity-60 rtl:rotate-180"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="ierp-focus-ring max-w-[12rem] truncate rounded-sm hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "max-w-[16rem] truncate",
                    isLast && "font-medium text-[var(--foreground)]"
                  )}
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
