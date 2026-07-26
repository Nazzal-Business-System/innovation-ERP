"use client";

import { ModuleLayout } from "@/components/layout/module-layout";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsPageSkeleton() {
  return (
    <ModuleLayout>
      <PageSkeleton />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </ModuleLayout>
  );
}

export function DocumentsTableSkeleton() {
  return (
    <ModuleLayout>
      <PageSkeleton />
      <Skeleton className="mt-6 h-96 rounded-xl" />
    </ModuleLayout>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <ModuleLayout>
      <PageSkeleton />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </ModuleLayout>
  );
}
