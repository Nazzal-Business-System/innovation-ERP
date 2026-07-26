"use client";

import type { EntityFieldItem, EntityFieldSpan } from "@/lib/entity-workspace/types";
import { cn } from "@/lib/utils";

function resolveSpan(span: EntityFieldItem["span"]): EntityFieldSpan {
  if (span === 1) return "md";
  if (span === 2) return "lg";
  return span ?? "md";
}

export function EntityFieldGrid({
  fields,
  className,
}: {
  fields: EntityFieldItem[];
  className?: string;
}) {
  if (!fields.length) return null;

  return (
    <dl className={cn("ew-field-grid", className)}>
      {fields.map((field) => {
        const span = resolveSpan(field.span);
        return (
          <div
            key={field.id}
            data-span={span}
            className={cn(
              "ew-field-item min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/40 px-3 py-2",
              span === "sm" && "ew-field-span-sm",
              span === "md" && "ew-field-span-md",
              span === "lg" && "ew-field-span-lg",
              span === "full" && "ew-field-span-full"
            )}
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {field.label}
            </dt>
            <dd
              className={cn(
                "mt-1 break-words text-sm text-[var(--foreground)]",
                field.mono && "ew-ltr-isolate font-mono text-xs"
              )}
              title={typeof field.value === "string" ? field.value : undefined}
            >
              {field.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
