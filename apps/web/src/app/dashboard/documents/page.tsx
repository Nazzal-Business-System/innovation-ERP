"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Clock, FileText, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentsNavLinks } from "@/components/documents/documents-gate";
import { fileColumns, DOCUMENT_MODULE_LABELS } from "@/components/documents/documents-columns";
import { DocumentsPageSkeleton } from "@/components/documents/documents-page-skeleton";
import { useDocumentsOverview } from "@/lib/hooks/use-documents";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { DocumentFile } from "@ierp/shared";

export default function DocumentsOverviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useDocumentsOverview();

  function handleFileClick(file: DocumentFile) {
    const href = `/dashboard/documents/files/${file.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) return <DocumentsPageSkeleton />;

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("documents.loadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const moduleTotal = overview.documentsByModule.reduce((s, x) => s + x.count, 0) || 1;
  const categoryTotal = overview.documentsByCategory.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("documents.title")}
          description={t("documents.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          actions={
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/documents/files/new"
                onClick={() => startNavigation("/dashboard/documents/files/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("documents.newDocument")}
              </Link>
            </Button>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <DocumentsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title={t("documents.totalDocuments")}
            value={String(overview.totalDocuments)}
            change={`${overview.activeDocuments} ${t("documents.activeDocuments").toLowerCase()}`}
            trend="neutral"
            icon={FileText}
          />
          <KpiCard
            title={t("documents.activeDocuments")}
            value={String(overview.activeDocuments)}
            trend="up"
            icon={FolderOpen}
          />
          <KpiCard
            title={t("documents.expiredDocuments")}
            value={String(overview.expiredDocuments)}
            change={
              overview.expiredDocuments > 0
                ? t("documents.needsAttention")
                : t("documents.allCurrent")
            }
            trend={overview.expiredDocuments > 0 ? "down" : "up"}
            icon={AlertTriangle}
          />
          <KpiCard
            title={t("documents.pendingReview")}
            value={String(overview.pendingReview)}
            trend={overview.pendingReview > 0 ? "down" : "neutral"}
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
              <CardContent className="space-y-3">
                {overview.documentsByModule.map((item) => (
                  <div key={item.module} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{DOCUMENT_MODULE_LABELS[item.module]}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / moduleTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
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
              <CardContent className="space-y-3">
                {overview.documentsByCategory.map((item) => (
                  <div key={item.categoryId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.categoryName}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / categoryTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("documents.expiringSoon")}</h2>
            <Link
              href="/dashboard/documents/expiring"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
              onClick={() => startNavigation("/dashboard/documents/expiring")}
            >
              {t("documents.viewAll")} →
            </Link>
          </div>
          <DataTable
            columns={fileColumns}
            data={overview.expiringSoon}
            onRowClick={handleFileClick}
            pageSize={6}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("documents.recentUploads")}</h2>
            <Link
              href="/dashboard/documents/files"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
              onClick={() => startNavigation("/dashboard/documents/files")}
            >
              {t("documents.viewAll")} →
            </Link>
          </div>
          <DataTable
            columns={fileColumns}
            data={overview.recentUploads}
            onRowClick={handleFileClick}
            pageSize={8}
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
