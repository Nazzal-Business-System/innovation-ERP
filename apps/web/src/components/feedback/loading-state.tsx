import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  title?: string;
  description?: string;
  variant?: "spinner" | "skeleton" | "inline";
  className?: string;
}

export function LoadingState({
  title = "Loading…",
  description,
  variant = "spinner",
  className,
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-[var(--muted)]", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" aria-hidden />
        {title}
      </span>
    );
  }

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
      <div>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      </div>
    </div>
  );
}

export { AppShellSkeleton, DashboardSkeleton } from "@/components/feedback/dashboard-skeleton";
export { FullPageLoader } from "@/components/feedback/full-page-loader";
export { PageSkeleton } from "@/components/feedback/page-skeleton";
export { CardSkeleton } from "@/components/feedback/card-skeleton";
export { TableSkeleton } from "@/components/feedback/table-skeleton";
