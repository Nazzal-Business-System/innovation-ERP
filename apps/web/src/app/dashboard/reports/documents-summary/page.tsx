"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBarChart } from "@/components/reports/lazy-report-charts";
import { ReportsNavLinks } from "@/components/reports/reports-gate";
import { ReportsDetailSkeleton } from "@/components/reports/reports-page-skeleton";
import { DOCUMENT_MODULE_LABELS } from "@/components/documents/documents-columns";
import { useDocumentsSummaryReport } from "@/lib/hooks/use-documents";
import { formatDisplayDate } from "@/lib/date";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, Clock, FileText, FolderOpen } from "lucide-react";

export default function DocumentsSummaryPage() {
  const { t, locale } = useI18n();
  const { data: report, loading, error, refetch } = useDocumentsSummaryReport();
  const { startNavigation } = useNavigation();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title={t("documents.reportLoadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const moduleChartData = report.documentsByModule.map((row) => ({
    label: DOCUMENT_MODULE_LABELS[row.module],
    count: row.count,
  }));

  const categoryChartData = report.documentsByCategory.map((row) => ({
    label: row.categoryName,
    count: row.count,
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title={t("nav.documentsSummary")}
          description={t("documents.reportDescription")}
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t("common.liveData")}</Badge>
            </div>
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ReportsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title={t("documents.totalDocuments")}
            value={String(report.totalDocuments)}
            trend="neutral"
            icon={FileText}
          />
          <KpiCard
            title={t("documents.activeDocuments")}
            value={String(report.activeDocuments)}
            trend="neutral"
            icon={FolderOpen}
          />
          <KpiCard
            title={t("documents.expiredDocuments")}
            value={String(report.expiredDocuments)}
            trend={report.expiredDocuments > 0 ? "down" : "neutral"}
            icon={AlertTriangle}
          />
          <KpiCard
            title={t("documents.expiringIn30")}
            value={String(report.expiringIn30Days)}
            trend={report.expiringIn30Days > 0 ? "down" : "neutral"}
            icon={Clock}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("documents.documentsByModule")}</CardTitle>
                <CardDescription>{t("documents.moduleDistribution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={moduleChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
        <FadeIn delay={0.1}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("documents.documentsByCategory")}</CardTitle>
                <CardDescription>{t("documents.categoryDistribution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={categoryChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <PremiumCard>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t("documents.pendingReviewList")}</CardTitle>
              <CardDescription>{t("documents.pendingReview")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.pendingReviewList.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">{t("documents.nonePending")}</p>
              ) : (
                report.pendingReviewList.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/files/${doc.id}`}
                    onClick={() => startNavigation(`/dashboard/documents/files/${doc.id}`)}
                    className="flex cursor-pointer justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm hover:border-[var(--sidebar-active-border)]"
                  >
                    <span className="font-medium">{doc.title}</span>
                    <span className="text-[var(--muted)]">{doc.fileNumber}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>

      <FadeIn delay={0.14}>
        <PremiumCard>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t("documents.expiredList")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.expiredList.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/files/${doc.id}`}
                  onClick={() => startNavigation(`/dashboard/documents/files/${doc.id}`)}
                  className="flex cursor-pointer justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm hover:border-[var(--sidebar-active-border)]"
                >
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-[var(--destructive)]">
                    {formatDisplayDate(doc.expiryDate, locale)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </>
  );
}
