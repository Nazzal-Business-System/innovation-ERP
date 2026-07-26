"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}

export function StaggerChildren({
  children,
  className,
  stagger = 0.06,
  delay = 0,
}: StaggerChildrenProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn("ierp-stagger-children", className)}
      style={
        {
          "--ierp-stagger-step": `${stagger}s`,
          "--ierp-stagger-delay": `${delay}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ierp-stagger-item", className)}>{children}</div>;
}
