"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface TiltCardProps {
  className?: string;
  children?: ReactNode;
  maxTilt?: number;
  interactive?: boolean;
}

export function TiltCard({
  className,
  children,
  maxTilt = 6,
  interactive = false,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion || !interactive) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * maxTilt * 2);
    rotateX.set(-y * maxTilt * 2);
  }

  function handleLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        interactive && !reducedMotion
          ? { rotateX, rotateY, transformPerspective: 900 }
          : undefined
      }
      className={cn(
        "relative",
        interactive && "[transform-style:preserve-3d] cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
