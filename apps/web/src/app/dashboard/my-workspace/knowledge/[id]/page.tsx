"use client";

import Link from "next/link";
import { use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate } from "@/lib/date";
import { useSelfKnowledgeArticle } from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

export default function MyKnowledgeArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { data: article, loading, error, refetch } = useSelfKnowledgeArticle(id);

  if (loading && !article) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !article) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error ?? undefined}
          onRetry={() => void refetch()}
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/my-workspace/knowledge">
              {t("selfService.backToKnowledge", "Back to knowledge")}
            </Link>
          </Button>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader
          title={article.title}
          description={t("selfService.articleDetail", "Article")}
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/dashboard/my-workspace/knowledge">
                {t("selfService.backToKnowledge", "Back to knowledge")}
              </Link>
            </Button>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span className="ew-ltr-isolate font-mono">{article.articleNumber}</span>
          {article.category ? <Badge variant="outline">{article.category.name}</Badge> : null}
          {article.publishedAt ? (
            <span className="ew-ltr-isolate">
              {formatDisplayDate(article.publishedAt.slice(0, 10), locale)}
            </span>
          ) : null}
          {article.author ? <span>{article.author.name}</span> : null}
        </div>
        {article.summary ? (
          <p className="mb-4 text-sm text-[var(--muted)]">{article.summary}</p>
        ) : null}
        {article.tags.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
        <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-[var(--foreground)]">
            {article.content}
          </pre>
        </article>
      </FadeIn>
    </ModuleLayout>
  );
}
