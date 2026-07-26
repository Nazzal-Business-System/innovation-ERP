"use client";

import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface FadeInProps {
  children?: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  style?: CSSProperties;
}

export function FadeIn({
  className,
  children,
  delay = 0,
  duration = 0.4,
  style,
}: FadeInProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className={cn(className)} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("ierp-fade-in", className)}
      style={
        {
          ...style,
          "--ierp-fade-delay": `${delay}s`,
          "--ierp-fade-duration": `${duration}s`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
