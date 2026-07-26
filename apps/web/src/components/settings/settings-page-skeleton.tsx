import { CardSkeleton } from "@/components/feedback/card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-9 w-full max-w-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function SettingsTableSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-[var(--border-subtle)] pb-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-9 w-full max-w-3xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  );
}
