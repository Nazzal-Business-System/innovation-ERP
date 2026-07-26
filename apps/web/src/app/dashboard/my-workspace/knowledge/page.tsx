"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import {
  useSelfKnowledgeArticles,
  useSelfKnowledgeCategories,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

export default function MyKnowledgePage() {
  const { t, locale } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { data: categoriesData } = useSelfKnowledgeCategories();
  const { data, loading, error, refetch } = useSelfKnowledgeArticles({
    search: search || undefined,
    categoryId: categoryId || undefined,
  });

  const categoryOptions = [
    { value: "", label: t("selfService.allCategories", "All categories") },
    ...(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error && !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const articles = data?.data ?? [];

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.knowledgeTitle", "Knowledge base")}
          description={t(
            "selfService.knowledgeDesc",
            "Company articles and guides available to you."
          )}
          badge={<Badge variant="secondary">{articles.length}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 sm:flex-row sm:items-end">
          <FormField
            htmlFor="knowledge-search"
            label={t("selfService.searchArticles", "Search articles")}
            className="min-w-0 flex-1"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="knowledge-search"
                className={`${inputClassName} ps-9`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSearch(searchInput.trim());
                }}
                placeholder={t("selfService.searchArticles", "Search articles")}
              />
            </div>
          </FormField>
          <SelectField
            id="knowledge-category"
            label={t("hr.category", "Category")}
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
          />
          <Button type="button" size="sm" onClick={() => setSearch(searchInput.trim())}>
            {t("common.search", "Search")}
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-10 text-center text-sm text-[var(--muted)]">
            {t("selfService.noArticles", "No articles match your filters.")}
          </div>
        ) : (
          <ul className="space-y-2">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/dashboard/my-workspace/knowledge/${article.id}`}
                  className="block rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition-colors hover:border-[var(--accent)]/35 hover:bg-[var(--accent)]/[0.03]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--foreground)]">{article.title}</span>
                    {article.category ? (
                      <Badge variant="outline">{article.category.name}</Badge>
                    ) : null}
                  </div>
                  {article.summary ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {article.summary}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <span className="ew-ltr-isolate font-mono">{article.articleNumber}</span>
                    {article.publishedAt
                      ? ` · ${formatDisplayDate(article.publishedAt.slice(0, 10), locale)}`
                      : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
    </ModuleLayout>
  );
}
