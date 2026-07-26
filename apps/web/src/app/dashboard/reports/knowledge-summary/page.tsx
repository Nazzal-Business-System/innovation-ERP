"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBarChart } from "@/components/reports/lazy-report-charts";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { useKnowledgeSummaryReport } from "@/lib/hooks/use-knowledge";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { BookOpen, FileText, LifeBuoy, Tags } from "lucide-react";

export default function KnowledgeSummaryPage() {
  const { t } = useI18n();
  const { data: report, loading, error, refetch } = useKnowledgeSummaryReport();
  const { startNavigation } = useNavigation();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title={t("knowledge.reportLoadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const categoryChartData = report.topCategories.map((row) => ({
    label: row.name,
    count: row.count,
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title={t("nav.knowledgeSummary")}
          description={t("knowledge.reportDescription")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ReportsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard title={t("knowledge.totalArticles")} value={String(report.totalArticles)} trend="neutral" icon={BookOpen} />
          <KpiCard title={t("knowledge.publishedArticles")} value={String(report.publishedArticles)} trend="neutral" icon={FileText} />
          <KpiCard title={t("knowledge.reviewArticles")} value={String(report.reviewArticles)} trend="neutral" icon={Tags} />
          <KpiCard title={t("knowledge.supportLinked")} value={String(report.supportLinkedArticles)} trend="neutral" icon={LifeBuoy} />
        </MetricGrid>
      </FadeIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("knowledge.topCategories")}</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBarChart data={categoryChartData} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("knowledge.statusBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>{t("knowledge.publishedArticles")}</span><span>{report.publishedArticles}</span></div>
              <div className="flex justify-between"><span>{t("knowledge.reviewArticles")}</span><span>{report.reviewArticles}</span></div>
              <div className="flex justify-between"><span>{t("knowledge.draftArticles")}</span><span>{report.draftArticles}</span></div>
              <div className="flex justify-between"><span>{t("knowledge.archivedArticles")}</span><span>{report.archivedArticles}</span></div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("knowledge.recentArticles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.recentArticles.map((article) => {
                const href = `/dashboard/knowledge/articles/${article.id}`;
                return (
                  <li key={article.id}>
                    <Link
                      href={href}
                      onClick={() => startNavigation(href)}
                      className="ierp-focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm hover:bg-[var(--accent-muted)]"
                    >
                      <div>
                        <p className="font-medium">{article.title}</p>
                        <p className="text-xs text-[var(--muted)]">{article.articleNumber}</p>
                      </div>
                      <span className="text-[var(--accent)]">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </FadeIn>
    </>
  );
}
