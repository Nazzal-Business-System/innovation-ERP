"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EntityStatus({
  label,
  variant = "default",
  className,
}: {
  label: string;
  variant?: BadgeProps["variant"];
  className?: string;
}) {
  return (
    <Badge
      variant={variant}
      className={cn("shrink-0", className)}
      role="status"
      aria-label={label}
    >
      {label}
    </Badge>
  );
}
