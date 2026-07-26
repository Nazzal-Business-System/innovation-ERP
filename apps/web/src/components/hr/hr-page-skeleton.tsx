import { CardSkeleton } from "@/components/feedback/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function HrPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function HrTableSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  );
}

export function HrDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-36" />
      <div className="flex flex-col items-center gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-start">
        <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
        <div className="w-full space-y-3">
          <Skeleton className="mx-auto h-8 w-56 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-72 max-w-full sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-64 max-w-full sm:mx-0" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
