"use client";

import { cn } from "@/lib/utils";

interface ShimmerBorderProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  rounded?: string;
}

export function ShimmerBorder({
  children,
  className,
  active = false,
  rounded = "rounded-2xl",
}: ShimmerBorderProps) {
  return (
    <div className={cn("relative", rounded, className)}>
      {active && (
        <div
          className={cn(
            "pointer-events-none absolute -inset-px overflow-hidden",
            rounded
          )}
          aria-hidden
        >
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(129,140,248,0.35), transparent)",
              backgroundSize: "200% 100%",
              animation: "ierp-shimmer-pan 1.8s linear infinite",
            }}
          />
        </div>
      )}
      <div className={cn("relative", rounded)}>{children}</div>
    </div>
  );
}
