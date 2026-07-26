"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ContactRound,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmPageSkeleton } from "@/components/crm/crm-page-skeleton";
import { activityColumns, LEAD_SOURCE_LABELS, opportunityColumns } from "@/components/crm/crm-columns";
import { useCrmOverview } from "@/lib/hooks/use-crm";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CrmActivity, CrmOpportunity } from "@ierp/shared";

export default function CrmOverviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useCrmOverview();

  function handleOppClick(opp: CrmOpportunity) {
    const href = `/dashboard/crm/opportunities/${opp.id}`;
    startNavigation(href);
    router.push(href);
  }

  function handleActivityClick(act: CrmActivity) {
    const href = `/dashboard/crm/activities/${act.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) return <CrmPageSkeleton />;

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load CRM" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const sourceTotal = overview.leadsBySource.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("crm.title")}
          description={t("crm.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <CrmNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard title="Total Leads" value={String(overview.totalLeads)} change={`${overview.qualifiedLeads} ${t("crm.qualifiedLeads").toLowerCase()}`} trend="neutral" icon={ContactRound} />
          <KpiCard title={t("crm.openOpportunities")} value={String(overview.openOpportunities)} change={t("crm.pipelineValue")} trend="neutral" icon={Target} />
          <KpiCard title={t("crm.pipelineValue")} value={overview.pipelineValue} change={t("crm.weightedPipeline")} trend="neutral" icon={TrendingUp} />
          <KpiCard title={t("crm.wonDealsMonth")} value={String(overview.wonDealsThisMonth)} change={overview.weightedPipelineValue} trend="neutral" icon={Trophy} />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.07}>
        <MetricGrid columns={2}>
          <KpiCard title={t("crm.weightedPipeline")} value={overview.weightedPipelineValue} change="Probability-adjusted" trend="neutral" icon={TrendingUp} />
          <KpiCard title={t("crm.overdueActivities")} value={String(overview.overdueActivities)} change={overview.overdueActivities > 0 ? "Needs attention" : "All on track"} trend={overview.overdueActivities > 0 ? "down" : "up"} icon={AlertTriangle} />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("crm.leadsBySource")}</CardTitle>
                <CardDescription>Lead acquisition channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.leadsBySource.map((item) => (
                  <div key={item.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{LEAD_SOURCE_LABELS[item.source]}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / sourceTotal) * 100}%` }}
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
                <CardTitle className="text-base">{t("crm.pipelineByStage")}</CardTitle>
                <CardDescription>Opportunity distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.opportunitiesByStage.map((item) => (
                  <div
                    key={item.stage}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.stage.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[var(--muted)]">{item.count} deals</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">{item.totalValue}</p>
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
            <h2 className="text-lg font-semibold">{t("crm.topOpportunities")}</h2>
            <Link href="/dashboard/crm/opportunities" className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline">
              View all →
            </Link>
          </div>
          <DataTable columns={opportunityColumns} data={overview.topOpportunities} onRowClick={handleOppClick} pageSize={6} />
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("crm.upcomingActivities")}</h2>
            <Link href="/dashboard/crm/activities" className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline">
              View all →
            </Link>
          </div>
          <DataTable columns={activityColumns} data={overview.upcomingActivities} onRowClick={handleActivityClick} pageSize={8} />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
