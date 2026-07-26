"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AlertTriangle, Clock } from "lucide-react";
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
import { useDocumentFiles } from "@/lib/hooks/use-documents";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { DocumentFile } from "@ierp/shared";

export default function DocumentsExpiringPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: expiredData, loading: loadingExpired, error: expiredError, refetch } = useDocumentFiles({
    status: "EXPIRED",
  });
  const { data: activeData, loading: loadingActive } = useDocumentFiles({ status: "ACTIVE" });

  const expiringSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);
    return (activeData?.data ?? []).filter((f) => {
      if (!f.expiryDate) return false;
      const exp = new Date(f.expiryDate);
      return exp >= today && exp <= in30;
    });
  }, [activeData]);

  const moduleBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of [...(expiredData?.data ?? []), ...expiringSoon]) {
      if (f.primaryModule) {
        map.set(f.primaryModule, (map.get(f.primaryModule) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([module, count]) => ({ module, count }));
  }, [expiredData, expiringSoon]);

  function handleRowClick(row: DocumentFile) {
    const href = `/dashboard/documents/files/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if ((loadingExpired || loadingActive) && !expiredData) return <DocumentsPageSkeleton />;

  if (expiredError) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("documents.loadError")}
          description={expiredError}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader title={t("documents.expiringTitle")} description={t("documents.expiringDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <DocumentsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <MetricGrid columns={2}>
          <KpiCard
            title={t("documents.expiredDocuments")}
            value={String(expiredData?.data.length ?? 0)}
            trend="down"
            icon={AlertTriangle}
          />
          <KpiCard
            title={t("documents.expiringIn30")}
            value={String(expiringSoon.length)}
            trend={expiringSoon.length > 0 ? "down" : "up"}
            icon={Clock}
          />
        </MetricGrid>
      </FadeIn>

      {moduleBreakdown.length > 0 && (
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("documents.expiryByModule")}</CardTitle>
                <CardDescription>{t("documents.moduleDistribution")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {moduleBreakdown.map((item) => (
                  <div
                    key={item.module}
                    className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {DOCUMENT_MODULE_LABELS[item.module as keyof typeof DOCUMENT_MODULE_LABELS]}
                    </span>
                    <span className="ms-2 tabular-nums text-[var(--muted)]">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("documents.expiredList")}</h2>
          <DataTable
            columns={fileColumns}
            data={expiredData?.data ?? []}
            onRowClick={handleRowClick}
            pageSize={10}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("documents.expiringSoonList")}</h2>
          <DataTable
            columns={fileColumns}
            data={expiringSoon}
            onRowClick={handleRowClick}
            pageSize={10}
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
