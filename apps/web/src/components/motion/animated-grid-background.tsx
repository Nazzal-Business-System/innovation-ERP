"use client";

import { cn } from "@/lib/utils";

interface AnimatedGridBackgroundProps {
  className?: string;
}

export function AnimatedGridBackground({ className }: AnimatedGridBackgroundProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.35]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.03) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "ierp-shimmer-pan 12s ease-in-out infinite",
        }}
      />
    </div>
  );
}
