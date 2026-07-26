"use client";

import dynamic from "next/dynamic";
import { LayoutDashboard } from "lucide-react";
import type { ExecutiveDashboardResponse } from "@ierp/shared";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { BranchOverviewSection } from "@/components/dashboard/branch-overview-section";
import { BusinessHealthSection } from "@/components/dashboard/business-health-section";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ExecutiveInsightsSection } from "@/components/dashboard/executive-insights-section";
import { ExecutiveKpiGrid } from "@/components/dashboard/executive-kpi-grid";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageSection } from "@/components/layout/page-section";
import { useI18n } from "@/lib/i18n";

const ExecutiveChartsSection = dynamic(
  () =>
    import("@/components/dashboard/executive-charts-section").then((m) => ({
      default: m.ExecutiveChartsSection,
    })),
  {
    loading: () => (
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded-[var(--radius-lg)] bg-[var(--muted-bg)] ierp-skeleton-shimmer" />
        ))}
      </div>
    ),
  }
);

interface ExecutiveDashboardViewProps {
  data: ExecutiveDashboardResponse;
  userName?: string;
  organizationName?: string;
}

export function ExecutiveDashboardView({
  data,
  userName,
}: ExecutiveDashboardViewProps) {
  const { t } = useI18n();
  const greeting = userName ? `${t("dashboard.title")}, ${userName.split(" ")[0]}` : t("dashboard.title");

  return (
    <ModuleLayout>
      <DashboardHero
        eyebrow={t("nav.dashboard")}
        title={greeting}
        description={t("dashboard.description")}
        icon={LayoutDashboard}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[var(--highlight)]/30 text-[var(--highlight)]">
              {t("common.liveData")}
            </Badge>
            <Badge variant="secondary">{data.currency}</Badge>
          </div>
        }
        stats={[
          { label: t("dashboard.stat.revenue"), value: data.kpis.revenue.formatted },
          { label: t("dashboard.stat.orders"), value: data.kpis.openOrders.formatted },
          { label: t("dashboard.stat.customers"), value: data.kpis.customers.formatted },
          { label: t("dashboard.stat.period"), value: data.period },
        ]}
      />

      <PageSection title={t("dashboard.section.kpis")}>
        <ExecutiveKpiGrid kpis={data.kpis} />
      </PageSection>

      <PageSection title={t("dashboard.section.health")}>
        <BusinessHealthSection metrics={data.businessHealth} />
      </PageSection>

      <PageSection title={t("dashboard.section.analytics")} description={t("charts.selectType")}>
        <ExecutiveChartsSection charts={data.charts} currency={data.currency} />
      </PageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title={t("dashboard.section.branches")}>
          <BranchOverviewSection branches={data.branches} />
        </PageSection>
        <PageSection title={t("dashboard.section.insights")}>
          <ExecutiveInsightsSection insights={data.insights} />
        </PageSection>
      </div>

      <PageSection title={t("dashboard.section.activity")}>
        <ActivityTimeline items={data.activities} />
      </PageSection>
    </ModuleLayout>
  );
}
