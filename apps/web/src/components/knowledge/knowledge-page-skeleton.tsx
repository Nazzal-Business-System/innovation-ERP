import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function KnowledgePageSkeleton() {
  return (
    <ModuleLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </ModuleLayout>
  );
}

export function KnowledgeTableSkeleton() {
  return (
    <ModuleLayout>
      <PageHeader title="" description="" />
      <Skeleton className="mb-4 h-10 w-full max-w-md" />
      <Skeleton className="h-96 rounded-xl" />
    </ModuleLayout>
  );
}

export function KnowledgeDetailSkeleton() {
  return (
    <ModuleLayout>
      <Skeleton className="mb-4 h-8 w-48" />
      <Skeleton className="mb-6 h-12 w-full max-w-2xl" />
      <Skeleton className="h-80 rounded-xl" />
    </ModuleLayout>
  );
}
