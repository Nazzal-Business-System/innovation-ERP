"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquare,
  Ticket,
} from "lucide-react";
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
import { SupportNavLinks } from "@/components/support/support-gate";
import { ticketColumns } from "@/components/support/support-columns";
import { SupportPageSkeleton } from "@/components/support/support-page-skeleton";
import { useSupportOverview } from "@/lib/hooks/use-support";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { SUPPORT_PERMISSIONS, type SupportTicket } from "@ierp/shared";
import { Plus } from "lucide-react";

export default function SupportOverviewPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SUPPORT_PERMISSIONS.WRITE);
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useSupportOverview();

  function handleTicketClick(ticket: SupportTicket) {
    const href = `/dashboard/support/tickets/${ticket.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) return <SupportPageSkeleton />;

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("support.loadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusTotal = overview.ticketsByStatus.reduce((s, x) => s + x.count, 0) || 1;
  const priorityTotal = overview.ticketsByPriority.reduce((s, x) => s + x.count, 0) || 1;
  const categoryTotal = overview.ticketsByCategory.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("support.title")}
          description={t("support.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/support/tickets/new"
                onClick={() => startNavigation("/dashboard/support/tickets/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("support.newTicket")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SupportNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title={t("support.totalTickets")}
            value={String(overview.totalTickets)}
            change={`${overview.openTickets} ${t("support.openTickets").toLowerCase()}`}
            trend="neutral"
            icon={Ticket}
          />
          <KpiCard
            title={t("support.openTickets")}
            value={String(overview.openTickets)}
            change={`${overview.criticalTickets} ${t("support.criticalTickets").toLowerCase()}`}
            trend="neutral"
            icon={Headphones}
          />
          <KpiCard
            title={t("support.overdueTickets")}
            value={String(overview.overdueTickets)}
            change={
              overview.overdueTickets > 0
                ? t("support.needsAttention")
                : t("support.allOnTrack")
            }
            trend={overview.overdueTickets > 0 ? "down" : "up"}
            icon={AlertTriangle}
          />
          <KpiCard
            title={t("support.avgResolutionHours")}
            value={`${overview.avgResolutionHours}h`}
            change={`${overview.criticalTickets} ${t("support.criticalTickets").toLowerCase()}`}
            trend="neutral"
            icon={Clock}
          />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.07}>
        <MetricGrid columns={2}>
          <KpiCard
            title={t("support.criticalTickets")}
            value={String(overview.criticalTickets)}
            change={t("support.openPriority")}
            trend={overview.criticalTickets > 0 ? "down" : "up"}
            icon={LifeBuoy}
          />
          <KpiCard
            title={t("support.avgResolutionHours")}
            value={`${overview.avgResolutionHours}h`}
            change={t("support.slaTracking")}
            trend="neutral"
            icon={MessageSquare}
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
              <CardContent className="space-y-3">
                {overview.ticketsByStatus.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.status.replace(/_/g, " ")}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / statusTotal) * 100}%` }}
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
                <CardTitle className="text-base">{t("support.ticketsByPriority")}</CardTitle>
                <CardDescription>{t("support.priorityDistribution")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.ticketsByPriority.map((item) => (
                  <div
                    key={item.priority}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.priority}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.count} {t("nav.tickets").toLowerCase()}
                      </p>
                    </div>
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / priorityTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      {overview.ticketsByCategory.length > 0 && (
        <FadeIn delay={0.11}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("support.ticketsByCategory")}</CardTitle>
                <CardDescription>{t("support.categoryDistribution")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.ticketsByCategory.map((item) => (
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
      )}

      <FadeIn delay={0.12}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("support.overdueList")}</h2>
            <Link
              href="/dashboard/support/tickets"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
              onClick={() => startNavigation("/dashboard/support/tickets")}
            >
              {t("support.viewAll")} →
            </Link>
          </div>
          <DataTable
            columns={ticketColumns}
            data={overview.overdueList}
            onRowClick={handleTicketClick}
            pageSize={6}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("support.recentTickets")}</h2>
            <Link
              href="/dashboard/support/tickets"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
              onClick={() => startNavigation("/dashboard/support/tickets")}
            >
              {t("support.viewAll")} →
            </Link>
          </div>
          <DataTable
            columns={ticketColumns}
            data={overview.recentTickets}
            onRowClick={handleTicketClick}
            pageSize={8}
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
