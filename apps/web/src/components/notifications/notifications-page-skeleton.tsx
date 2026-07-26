"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ModuleLayout } from "@/components/layout/module-layout";

export function NotificationsPageSkeleton() {
  return (
    <ModuleLayout maxWidth="lg">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </ModuleLayout>
  );
}
