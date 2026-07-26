import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedGridBackground } from "@/components/motion/animated-grid-background";
import { FloatingOrb } from "@/components/motion/floating-orb";

interface FullPageLoaderProps {
  title?: string;
  description?: string;
  className?: string;
}

export function FullPageLoader({
  title = "Loading…",
  description,
  className,
}: FullPageLoaderProps) {
  return (
    <div
      className={cn(
        "relative flex h-screen items-center justify-center overflow-hidden bg-[var(--background)]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <AnimatedGridBackground />
      <FloatingOrb className="-left-20 top-1/4" color="indigo" size="lg" />
      <FloatingOrb className="bottom-0 right-0" color="violet" size="md" delay={2} />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        {description && <p className="text-sm text-[var(--muted)]">{description}</p>}
      </div>
    </div>
  );
}
