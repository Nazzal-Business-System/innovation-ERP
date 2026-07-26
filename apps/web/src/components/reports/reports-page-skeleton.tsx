import { CardSkeleton } from "@/components/feedback/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Section siblings for ModuleLayout / `.ierp-page-stack` (no nested stack). */
export function ReportsPageSkeleton() {
  return (
    <>
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </>
  );
}

export function ReportsDetailSkeleton() {
  return (
    <>
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </>
  );
}
