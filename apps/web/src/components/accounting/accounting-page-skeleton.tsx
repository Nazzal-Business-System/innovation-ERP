import { CardSkeleton } from "@/components/feedback/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function AccountingPageSkeleton() {
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

export function AccountingTableSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  );
}

export function AccountingDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-9 w-36" />
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-9 w-96 max-w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
