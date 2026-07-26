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
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import {
  articleColumns,
  KNOWLEDGE_STATUS_LABELS,
  KNOWLEDGE_VISIBILITY_LABELS,
} from "@/components/knowledge/knowledge-columns";
import { KnowledgeTableSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import { useKnowledgeArticles, useKnowledgeCategories } from "@/lib/hooks/use-knowledge";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { KnowledgeArticle } from "@ierp/shared";

export default function KnowledgeArticlesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [visibility, setVisibility] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesData } = useKnowledgeCategories({ activeOnly: true });
  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    status,
    visibility,
    categoryId,
  ]);
  const { data, loading, error, refetch } = useKnowledgeArticles({
    search: debouncedSearch || undefined,
    status: status || undefined,
    visibility: visibility || undefined,
    categoryId: categoryId || undefined,
    page,
  });

  const pagination = data
    ? {
        page: data.page,
        limit: data.pageSize,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / (data.pageSize || 1))),
      }
    : undefined;

  function handleRowClick(row: KnowledgeArticle) {
    const href = `/dashboard/knowledge/articles/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <KnowledgeTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("knowledge.articlesLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(pagination, onPageChange, loading);
  const filterSelect = cn(selectClassName, "w-auto min-w-[8.5rem] shrink-0");

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("knowledge.articlesTitle")}
          description={t("knowledge.articlesDesc")}
          badge={
            <Badge variant="outline">
              {data?.total ?? 0} {t("knowledge.articlesCountLabel", "articles")}
            </Badge>
          }
          actions={
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/knowledge/articles/new"
                onClick={() => startNavigation("/dashboard/knowledge/articles/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("knowledge.newArticle")}
              </Link>
            </Button>
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <KnowledgeNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("knowledge.searchArticles")}
          filters={
            <>
              <select
                aria-label={t("knowledge.filterStatus", "Filter by status")}
                className={filterSelect}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">{t("knowledge.allStatuses")}</option>
                {Object.entries(KNOWLEDGE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("knowledge.filterVisibility", "Filter by visibility")}
                className={filterSelect}
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="">{t("knowledge.allVisibility")}</option>
                {Object.entries(KNOWLEDGE_VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("knowledge.filterCategory", "Filter by category")}
                className={cn(filterSelect, "min-w-[10rem]")}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">{t("knowledge.allCategories")}</option>
                {(categoriesData?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          }
          endAddon={
            <ToolbarPagination
              pagination={pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
        />
        <div className="mt-4 overflow-x-auto">
          <DataTable
            columns={articleColumns(t, locale)}
            data={data?.data ?? []}
            onRowClick={handleRowClick}
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
