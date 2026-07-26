"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Flag,
  TrendingUp,
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
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import { milestoneColumns, projectColumns } from "@/components/projects/projects-columns";
import { ProjectsPageSkeleton } from "@/components/projects/projects-page-skeleton";
import { useProjectsOverview } from "@/lib/hooks/use-projects";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { Project, ProjectMilestone } from "@ierp/shared";
import { Plus } from "lucide-react";

export default function ProjectsOverviewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { data: overview, loading, error, refetch } = useProjectsOverview();

  function handleProjectClick(project: Project) {
    const href = `/dashboard/projects/${project.id}`;
    startNavigation(href);
    router.push(href);
  }

  function handleMilestoneClick(milestone: ProjectMilestone) {
    const href = `/dashboard/projects/${milestone.projectId}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading) return <ProjectsPageSkeleton />;

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("projects.loadError")}
          description={error ?? "No data"}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const statusTotal = overview.projectsByStatus.reduce((s, x) => s + x.count, 0) || 1;
  const taskStatusTotal = overview.tasksByStatus.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("projects.title")}
          description={t("projects.description")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          actions={
            <Button asChild className="cursor-pointer gap-2">
              <Link
                href="/dashboard/projects/new"
                onClick={() => startNavigation("/dashboard/projects/new")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("projects.newProject")}
              </Link>
            </Button>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProjectsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <MetricGrid columns={4}>
          <KpiCard
            title={t("projects.totalProjects")}
            value={String(overview.totalProjects)}
            change={`${overview.activeProjects} ${t("projects.activeProjects").toLowerCase()}`}
            trend="neutral"
            icon={FolderKanban}
          />
          <KpiCard
            title={t("projects.openTasks")}
            value={String(overview.openTasks)}
            change={`${overview.totalTasks} ${t("projects.totalTasks").toLowerCase()}`}
            trend="neutral"
            icon={ClipboardList}
          />
          <KpiCard
            title={t("projects.totalBudget")}
            value={overview.totalBudget}
            change={`${overview.averageProgress}% ${t("projects.averageProgress").toLowerCase()}`}
            trend="up"
            icon={TrendingUp}
          />
          <KpiCard
            title={t("projects.upcomingMilestones")}
            value={String(overview.upcomingMilestones)}
            change={`${overview.completedProjects} ${t("projects.completedProjects").toLowerCase()}`}
            trend="up"
            icon={Flag}
          />
        </MetricGrid>
      </FadeIn>

      <FadeIn delay={0.07}>
        <MetricGrid columns={2}>
          <KpiCard
            title={t("projects.overdueTasks")}
            value={String(overview.overdueTasks)}
            change={overview.overdueTasks > 0 ? "Needs attention" : "All on track"}
            trend={overview.overdueTasks > 0 ? "down" : "up"}
            icon={AlertTriangle}
          />
          <KpiCard
            title={t("projects.overdueMilestones")}
            value={String(overview.overdueMilestones)}
            change={`${overview.onHoldProjects} ${t("projects.onHoldProjects").toLowerCase()}`}
            trend={overview.overdueMilestones > 0 ? "down" : "neutral"}
            icon={CheckCircle2}
          />
        </MetricGrid>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.08}>
          <PremiumCard>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t("projects.projectsByStatus")}</CardTitle>
                <CardDescription>Project portfolio distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.projectsByStatus.map((item) => (
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
                <CardTitle className="text-base">{t("projects.tasksByStatus")}</CardTitle>
                <CardDescription>Task workflow distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.tasksByStatus.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.status.replace(/_/g, " ")}</p>
                      <p className="text-xs text-[var(--muted)]">{item.count} tasks</p>
                    </div>
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(item.count / taskStatusTotal) * 100}%` }}
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
            <h2 className="text-lg font-semibold">{t("projects.recentProjects")}</h2>
            <Link
              href="/dashboard/projects"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <DataTable
            columns={projectColumns}
            data={overview.recentProjects}
            onRowClick={handleProjectClick}
            pageSize={6}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("projects.upcomingMilestonesList")}</h2>
            <Link
              href="/dashboard/projects/milestones"
              className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
              onClick={() => startNavigation("/dashboard/projects/milestones")}
            >
              View all →
            </Link>
          </div>
          <DataTable
            columns={milestoneColumns}
            data={overview.upcomingMilestonesList}
            onRowClick={handleMilestoneClick}
            pageSize={8}
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
