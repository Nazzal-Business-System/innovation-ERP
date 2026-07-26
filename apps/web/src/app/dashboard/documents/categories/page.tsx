"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsNavLinks } from "@/components/documents/documents-gate";
import { categoryColumns } from "@/components/documents/documents-columns";
import { DocumentsTableSkeleton } from "@/components/documents/documents-page-skeleton";
import { useCreateDocumentCategory, useDocumentCategories } from "@/lib/hooks/use-documents";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";

export default function DocumentCategoriesPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(DOCUMENTS_PERMISSIONS.WRITE);
  const [createOpen, setCreateOpen] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState<"active" | "all" | "archived">("active");
  const createMutation = useCreateDocumentCategory();
  const { page, onPageChange } = useServerPagination([lifecycleFilter]);
  const activeOnly =
    lifecycleFilter === "active" ? true : lifecycleFilter === "archived" ? false : undefined;
  const { data, loading, error, refetch } = useDocumentCategories({ page, activeOnly });

  if (loading && !data) return <DocumentsTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("documents.categoriesLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("documents.categoriesTitle")}
          description={t("documents.categoriesDesc")}
          actions={
            canWrite ? (
              <Button type="button" className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("masterData.createCategory", "Create Category")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <DocumentsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <TableToolbar
          filters={
            <select
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
              value={lifecycleFilter}
              onChange={(e) =>
                setLifecycleFilter(e.target.value as "active" | "all" | "archived")
              }
              aria-label={t("masterData.lifecycle", "Lifecycle")}
            >
              <option value="active">{t("common.active", "Active")}</option>
              <option value="all">{t("masterData.allLifecycle", "All")}</option>
              <option value="archived">{t("masterData.archivedOnly", "Archived only")}</option>
            </select>
          }
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
        />
      </FadeIn>
      <FadeIn delay={0.08}>
        <DataTable
          columns={categoryColumns}
          data={data?.data ?? []}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>

      {canWrite ? (
        <CreateCategoryDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={t("masterData.createCategory", "Create Category")}
          detailHref={(id) => `/dashboard/documents/categories/${id}`}
          isPending={createMutation.isPending}
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      ) : null}
    </ModuleLayout>
  );
}
