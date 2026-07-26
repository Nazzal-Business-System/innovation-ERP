import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/feedback/card-skeleton";
import { AppScrollLock } from "@/components/layout/app-scroll-lock";

interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <>
      <AppScrollLock />
      <div className={cn("flex h-dvh max-h-dvh overflow-hidden bg-[var(--background)]", className)}>
        <aside className="ierp-sidebar-shell hidden w-64 shrink-0 border-e border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex lg:flex-col">
          <div className="border-b border-[var(--sidebar-border)] p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
          <div className="border-t border-[var(--sidebar-border)] p-3">
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Skeleton className="h-14 w-full shrink-0 rounded-none" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6">
            <div className="mb-6 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-72" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** @deprecated Use DashboardSkeleton */
export function AppShellSkeleton() {
  return <DashboardSkeleton />;
}
