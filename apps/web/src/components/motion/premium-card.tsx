"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps {
  className?: string;
  children?: ReactNode;
  glow?: boolean;
  /** Enable hover lift — use only for clickable cards */
  interactive?: boolean;
}

export function PremiumCard({
  className,
  children,
  glow = false,
  interactive = false,
}: PremiumCardProps) {
  return (
    <div
      className={cn(
        "surface-card rounded-xl transition-shadow duration-300",
        interactive && "cursor-pointer ierp-hover-lift",
        glow && interactive && "hover:shadow-[var(--shadow-glow)]",
        !interactive && glow && "hover:shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {children}
    </div>
  );
}
