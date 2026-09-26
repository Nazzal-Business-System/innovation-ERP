"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, Plus, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import { articleColumns } from "@/components/knowledge/knowledge-columns";
import { KnowledgePageSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import { useKnowledgeOverview } from "@/lib/hooks/use-knowledge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { KNOWLEDGE_PERMISSIONS, type KnowledgeArticle } from "@ierp/shared";

export default function KnowledgeOverviewPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(KNOWLEDGE_PERMISSIONS.WRITE);
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useKnowledgeOverview();

  function handleArticleClick(article: KnowledgeArticle) {
    const href = `/dashboard/knowledge/articles/${article.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) return <KnowledgePageSkeleton />;

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("knowledge.loadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const cols = articleColumns(t).slice(0, 5);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("knowledge.title")}
          description={t("knowledge.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/knowledge/articles/new"
                onClick={() => startNavigation("/dashboard/knowledge/articles/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("knowledge.newArticle")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <KnowledgeNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard title={t("knowledge.totalArticles")} value={String(overview.totalArticles)} trend="neutral" icon={BookOpen} />
          <KpiCard title={t("knowledge.publishedArticles")} value={String(overview.publishedArticles)} trend="up" icon={FileText} />
          <KpiCard title={t("knowledge.draftArticles")} value={String(overview.draftArticles)} trend="neutral" icon={FileText} />
          <KpiCard title={t("knowledge.reviewArticles")} value={String(overview.reviewArticles)} trend="neutral" icon={Tags} />
        </MetricGrid>
      </FadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("knowledge.articlesByCategory")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.articlesByCategory.map((c) => (
                <div key={c.categoryId} className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("knowledge.linkedStats")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">{t("knowledge.supportLinked")}</span>
                <span className="font-semibold">{overview.supportLinkedArticles}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">{t("knowledge.documentLinked")}</span>
                <span className="font-semibold">{overview.documentLinkedArticles}</span>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("knowledge.recentArticles")}</CardTitle>
            <CardDescription>{t("knowledge.recentArticlesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={cols} data={overview.recentArticles} onRowClick={handleArticleClick} />
          </CardContent>
        </Card>
      </FadeIn>

      {overview.articlesInReview.length > 0 && (
        <FadeIn delay={0.14}>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">{t("knowledge.articlesInReview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={cols} data={overview.articlesInReview} onRowClick={handleArticleClick} />
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </ModuleLayout>
  );
}
