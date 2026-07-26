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
import { useProjectsSummaryReport } from "@/lib/hooks/use-reports";
import { humanizeEnumLabel } from "@/lib/charts/chart-axis-utils";
import { useNavigation } from "@/lib/navigation-context";
import { CheckCircle2, FolderKanban, ListTodo, Target } from "lucide-react";

export default function ProjectsSummaryPage() {
  const { data: report, loading, error, refetch } = useProjectsSummaryReport();
  const { startNavigation } = useNavigation();

  if (loading) {
    return <ReportsDetailSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
          title="Unable to load projects summary"
          description={error ?? "No data"}
          onRetry={() => void refetch()}
      />
    );
  }

  const statusChartData = report.projectsByStatus.map((row) => ({
    label: humanizeEnumLabel(row.status),
    count: row.count,
  }));

  const taskChartData = report.tasksByStatus.map((row) => ({
    label: humanizeEnumLabel(row.status),
    count: row.count,
  }));

  return (
    <>
      <FadeIn>
        <PageHeader
          title="Projects Summary"
          description="Portfolio health, task completion, milestones, and budget utilization."
          badge={
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Live data</Badge>
              <Badge variant="secondary">Export coming soon</Badge>
            </div>
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ReportsNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard title="Total Projects" value={String(report.totalProjects)} trend="neutral" icon={FolderKanban} change={`${report.activeProjects} active`} />
          <KpiCard title="Avg Progress" value={`${report.averageProgress}%`} trend="neutral" icon={Target} change={`${report.completedProjects} completed`} />
          <KpiCard title="Open Tasks" value={String(report.openTasks)} trend="neutral" icon={ListTodo} change={`${report.completedTasks} done`} />
          <KpiCard title="Total Budget" value={report.totalBudget} trend="neutral" icon={CheckCircle2} change={`${report.overdueMilestones} overdue milestones`} />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Projects by Status</CardTitle>
                <CardDescription>Portfolio distribution</CardDescription>
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
                <CardTitle className="text-base">Tasks by Status</CardTitle>
                <CardDescription>Workload breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusBarChart data={taskChartData} />
              </CardContent>
            </Card>
          </PremiumCard>
        </FadeIn>
      </div>

      <FadeIn delay={0.1}>
        <PremiumCard>
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Top Projects by Budget</CardTitle>
              <CardDescription>Highest budget allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.topProjectsByBudget.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  onClick={() => startNavigation(`/dashboard/projects/${project.id}`)}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm transition-colors hover:bg-[var(--accent-muted)]"
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-xs text-[var(--muted)]">{project.code}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-medium">{project.budget}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {project.progress}% · {humanizeEnumLabel(project.status)}
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
