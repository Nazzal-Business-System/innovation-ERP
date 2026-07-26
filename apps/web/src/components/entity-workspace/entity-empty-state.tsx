"use client";

import { AlertTriangle, FileQuestion, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EntityEmptyState({
  variant = "empty",
  title,
  description,
  actionLabel,
  onAction,
  className,
  density = "default",
}: {
  variant?: "empty" | "error" | "placeholder";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Compact empty states for notes/attachments in dense layouts. */
  density?: "default" | "compact";
}) {
  const Icon = variant === "error" ? AlertTriangle : variant === "placeholder" ? FileQuestion : Inbox;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] text-center",
        density === "compact" ? "px-4 py-5" : "px-6 py-10",
        className
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      <Icon
        className={cn(
          density === "compact" ? "mb-2 h-5 w-5" : "mb-3 h-8 w-8",
          variant === "error" ? "text-[var(--destructive)]" : "text-[var(--muted)]"
        )}
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs text-[var(--muted)]">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" size="sm" className="mt-3" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
