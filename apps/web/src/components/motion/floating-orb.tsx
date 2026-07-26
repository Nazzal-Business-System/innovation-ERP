"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FloatingOrbProps {
  className?: string;
  color?: "indigo" | "violet" | "cyan";
  size?: "sm" | "md" | "lg";
  delay?: number;
}

const sizeMap = {
  sm: "h-48 w-48",
  md: "h-72 w-72",
  lg: "h-96 w-96",
};

const colorMap = {
  indigo: "orb-indigo",
  violet: "orb-violet",
  cyan: "bg-[radial-gradient(circle,rgba(34,211,238,0.2)_0%,transparent_70%)]",
};

export function FloatingOrb({
  className,
  color = "indigo",
  size = "md",
  delay = 0,
}: FloatingOrbProps) {
  return (
    <motion.div
      className={cn("absolute rounded-full blur-3xl", sizeMap[size], colorMap[color], className)}
      animate={{
        y: [0, -18, 0],
        x: [0, 10, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      aria-hidden
    />
  );
}
