"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useEntityLayout } from "./context/entity-layout-context";
import { cn } from "@/lib/utils";

export function EntitySection({
  id,
  title,
  description,
  children,
  actions,
  defaultOpen,
  collapsible,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  className?: string;
}) {
  const { preferCollapsedSections, layout } = useEntityLayout();
  const autoCollapsible = collapsible ?? layout === "focus";
  const initialOpen = defaultOpen ?? !preferCollapsedSections;
  const [open, setOpen] = useState(initialOpen);
  const panelId = useId();

  return (
    <section
      id={id}
      className={cn("ew-section", className)}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {autoCollapsible ? (
            <button
              type="button"
              className="ierp-focus-ring flex w-full items-center gap-2 rounded-md text-start"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              <h2 id={`${id}-heading`} className="text-sm font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              <ChevronDown
                className={cn(
                  "ms-auto h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          ) : (
            <h2 id={`${id}-heading`} className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h2>
          )}
          {description ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {(!autoCollapsible || open) && (
        <div id={panelId} className="min-w-0">
          {children}
        </div>
      )}
    </section>
  );
}
