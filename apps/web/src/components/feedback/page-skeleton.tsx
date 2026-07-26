import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  className?: string;
  showHeader?: boolean;
}

export function PageSkeleton({ className, showHeader = true }: PageSkeletonProps) {
  return (
    <div className={cn("ierp-page-stack", className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}
