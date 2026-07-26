"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { SupportNavLinks } from "@/components/support/support-gate";
import { categoryColumns } from "@/components/support/support-columns";
import { SupportTableSkeleton } from "@/components/support/support-page-skeleton";
import { useCreateSupportCategory, useSupportCategories } from "@/lib/hooks/use-support";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_PERMISSIONS } from "@ierp/shared";

export default function CategoriesPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SUPPORT_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<"active" | "all" | "archived">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const createMutation = useCreateSupportCategory();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, lifecycleFilter]);
  const activeOnly =
    lifecycleFilter === "active" ? true : lifecycleFilter === "archived" ? false : undefined;
  const { data, loading, error, refetch } = useSupportCategories({
    search: debouncedSearch || undefined,
    activeOnly,
    page,
  });

  if (loading && !data) return <SupportTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("support.categoriesLoadError")}
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
          title={t("support.categoriesTitle")}
          description={t("support.categoriesDesc")}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("nav.categories").toLowerCase()}
              </Badge>
            ) : undefined
          }
          actions={
            canWrite ? (
              <Button
                type="button"
                className="cursor-pointer gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("masterData.createCategory", "Create Category")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SupportNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("support.searchCategories")}
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
          detailHref={(id) => `/dashboard/support/categories/${id}`}
          isPending={createMutation.isPending}
          onSubmit={(input) => createMutation.mutateAsync(input)}
        />
      ) : null}
    </ModuleLayout>
  );
}
