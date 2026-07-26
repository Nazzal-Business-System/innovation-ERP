import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ className, rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
        <div className="flex gap-4 border-b border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="flex gap-4 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
          >
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
