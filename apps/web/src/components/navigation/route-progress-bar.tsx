"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface RouteProgressBarProps {
  active: boolean;
}

export function RouteProgressBar({ active }: RouteProgressBarProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden",
        active ? "opacity-100" : "opacity-0",
        reducedMotion ? "transition-opacity duration-150" : "transition-opacity duration-200"
      )}
      aria-hidden={!active}
      role="progressbar"
      aria-valuetext={active ? "Loading page" : undefined}
    >
      <div
        className={cn(
          "h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent",
          active && !reducedMotion && "animate-[ierp-route-progress_1.1s_ease-in-out_infinite]"
        )}
      />
    </div>
  );
}
