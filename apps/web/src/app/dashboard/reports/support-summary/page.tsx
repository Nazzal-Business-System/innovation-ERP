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
import { useSupportSummaryReport } from "@/lib/hooks/use-reports";
import { resolveChartLabel } from "@/lib/charts/chart-axis-utils";
import { formatEntityTimestamp } from "@/lib/date";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, Clock, Headphones, LifeBuoy } from "lucide-react";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@/components/support/support-columns";
import type { TicketPriority } from "@ierp/shared";

export default function SupportSummaryPage() {
  const { t, locale } = useI18n();
  const { data: report, loading, error, refetch } = useSupportSummaryReport();
  const { startNavigation } = useNavigation();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title={t("support.reportLoadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const statusChartData = report.ticketsByStatus.map((row) => ({
    label: resolveChartLabel(row.status, TICKET_STATUS_LABELS as Record<string, string>),
    count: row.count,
  }));

  const priorityChartData = report.ticketsByPriority.map((row) => ({
    label: resolveChartLabel(row.priority, TICKET_PRIORITY_LABELS as Record<string, string>),
    count: row.count,
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title={t("nav.supportSummary")}
          description={t("support.reportDescription")}
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{t("common.liveData")}</Badge>
              <Badge variant="secondary">{t("support.exportSoon")}</Badge>
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
            title={t("support.totalTickets")}
            value={String(report.totalTickets)}
            trend="neutral"
            icon={Headphones}
            change={`${report.openTickets} ${t("support.openTickets").toLowerCase()}`}
          />
          <KpiCard
            title={t("support.overdueTickets")}
            value={String(report.overdueTickets)}
            trend={report.overdueTickets > 0 ? "down" : "up"}
            icon={AlertTriangle}
            change={`${report.criticalTickets} ${t("support.criticalTickets").toLowerCase()}`}
          />
          <KpiCard
            title={t("support.avgResolutionHours")}
            value={`${report.avgResolutionHours}h`}
            trend="neutral"
            icon={Clock}
            change={`${report.slaCompliancePercent}% SLA`}
          />
          <KpiCard
            title={t("support.slaCompliance")}
            value={`${report.slaCompliancePercent}%`}
            trend={report.slaCompliancePercent >= 90 ? "up" : "down"}
            icon={LifeBuoy}
            change={t("support.slaTracking")}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("support.ticketsByStatus")}</CardTitle>
                <CardDescription>{t("support.statusDistribution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={statusChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>

        <FadeIn delay={0.09}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("support.ticketsByPriority")}</CardTitle>
                <CardDescription>{t("support.priorityDistribution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={priorityChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.1}>
        <PremiumCard>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t("support.topCategories")}</CardTitle>
              <CardDescription>{t("support.categoryDistribution")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.topCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-[var(--muted)]">{category.code}</p>
                  </div>
                  <span className="font-medium tabular-nums">{category.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>

      <FadeIn delay={0.11}>
        <PremiumCard>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">{t("support.overdueList")}</CardTitle>
              <CardDescription>{t("support.needsAttention")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.overdueList.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/dashboard/support/tickets/${ticket.id}`}
                  onClick={() => startNavigation(`/dashboard/support/tickets/${ticket.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm transition-colors hover:bg-[var(--accent-muted)]"
                >
                  <div>
                    <p className="font-medium">{ticket.ticketNumber}</p>
                    <p className="text-xs text-[var(--muted)]">{ticket.title}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-[var(--destructive)]">
                      {TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority] ??
                        resolveChartLabel(ticket.priority)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatEntityTimestamp(ticket.dueAt, locale) ?? "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </>
  );
}
