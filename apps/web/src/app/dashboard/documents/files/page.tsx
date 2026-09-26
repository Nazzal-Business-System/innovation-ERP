"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  fileColumnsForLocale,
  DOCUMENT_MODULE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from "@/components/documents/documents-columns";
import { DocumentsTableSkeleton } from "@/components/documents/documents-page-skeleton";
import { useDocumentCategories, useDocumentFiles } from "@/lib/hooks/use-documents";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DOCUMENTS_PERMISSIONS, type DocumentFile } from "@ierp/shared";


export default function DocumentFilesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(DOCUMENTS_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [module, setModule] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useDocumentCategories({ activeOnly: true });
  const { page, onPageChange } = useServerPagination([debouncedSearch, status, categoryId, module]);
  const { data, loading, error, refetch } = useDocumentFiles({
    search: debouncedSearch || undefined,
    status: status || undefined,
    categoryId: categoryId || undefined,
    module: module || undefined,
    page,
  });

  function handleRowClick(row: DocumentFile) {
    const href = `/dashboard/documents/files/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <DocumentsTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("documents.filesLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusOptions = [
    { value: "", label: t("documents.allStatuses") },
    ...Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const categoryOptions = [
    { value: "", label: t("documents.allCategories") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const moduleOptions = [
    { value: "", label: t("documents.allModules") },
    ...Object.entries(DOCUMENT_MODULE_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("documents.filesTitle")}
          description={t("documents.filesDesc")}
          badge={
            <Badge variant="outline">
              {data?.pagination.total ?? 0} {t("documents.filesTitle").toLowerCase()}
            </Badge>
          }
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/documents/files/new"
                onClick={() => startNavigation("/dashboard/documents/files/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("documents.newDocument")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <DocumentsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("documents.searchFiles")}
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select
                className={cn(selectClassName, "min-w-[140px]")}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label={t("documents.filterStatus")}
              >
                {statusOptions.map((o) => (
                  <option key={o.value || "all-status"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={cn(selectClassName, "min-w-[140px]")}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label={t("documents.filterCategory")}
              >
                {categoryOptions.map((o) => (
                  <option key={o.value || "all-category"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={cn(selectClassName, "min-w-[140px]")}
                value={module}
                onChange={(e) => setModule(e.target.value)}
                aria-label={t("documents.filterModule")}
              >
                {moduleOptions.map((o) => (
                  <option key={o.value || "all-module"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={fileColumnsForLocale(locale)}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
