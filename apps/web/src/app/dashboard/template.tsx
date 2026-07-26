"use client";

import { FadeIn } from "@/components/motion/fade-in";

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <FadeIn duration={0.3}>{children}</FadeIn>;
}
