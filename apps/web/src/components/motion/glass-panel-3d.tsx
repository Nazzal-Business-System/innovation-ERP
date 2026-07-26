"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassPanel3DProps {
  className?: string;
  children?: ReactNode;
  float?: boolean;
  tilt?: boolean;
}

export function GlassPanel3D({
  className,
  children,
  float = false,
  tilt = false,
}: GlassPanel3DProps) {
  return (
    <motion.div
      className={cn(
        "surface-glass relative overflow-hidden rounded-2xl shadow-[var(--shadow-lg)]",
        tilt && "[transform-style:preserve-3d]",
        className
      )}
      style={tilt ? { transform: "rotateY(-5deg) rotateX(3deg)" } : undefined}
      animate={float ? { y: [0, -5, 0] } : undefined}
      transition={float ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      {children}
    </motion.div>
  );
}
