"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import { Kanban, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import { taskColumns, TASK_PRIORITY_LABELS } from "@/components/projects/projects-columns";
import { ProjectsTableSkeleton } from "@/components/projects/projects-page-skeleton";
import { TaskKanbanBoard } from "@/components/projects/task-kanban-board";
import { useProjectTasks } from "@/lib/hooks/use-projects";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ProjectTask } from "@ierp/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  ...Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
];


type ViewMode = "list" | "kanban";

export default function TasksPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status, priority, viewMode]);

  const { data, loading, error, refetch } = useProjectTasks({
    search: debouncedSearch || undefined,
    status: viewMode === "kanban" ? undefined : status || undefined,
    priority: priority || undefined,
    limit: viewMode === "kanban" ? 100 : undefined,
    page: viewMode === "kanban" ? undefined : page,
  });

  function handleRowClick(row: ProjectTask) {
    const href = `/dashboard/projects/tasks/${row.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) return <ProjectsTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("projects.tasksLoadError")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const tasks = data?.data ?? [];
  const serverPagination =
    viewMode === "kanban" ? undefined : toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("projects.tasksTitle")}
          description={t("projects.tasksDesc")}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("nav.tasks").toLowerCase()}
              </Badge>
            ) : undefined
          }
          actions={
            <div className="flex gap-2">
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "secondary"}
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" aria-hidden />
                {t("projects.listView")}
              </Button>
              <Button
                type="button"
                variant={viewMode === "kanban" ? "default" : "secondary"}
                size="sm"
                className="cursor-pointer gap-2"
                onClick={() => setViewMode("kanban")}
              >
                <Kanban className="h-4 w-4" aria-hidden />
                {t("projects.kanbanBoard")}
              </Button>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProjectsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("projects.searchTasks")}
          endAddon={
            viewMode === "list" ? (
              <ToolbarPagination
                pagination={data?.pagination}
                onPageChange={onPageChange}
                disabled={loading}
              />
            ) : undefined
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClassName}
                aria-label="Filter by status"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={cn(selectClassName)}
                aria-label="Filter by priority"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        {viewMode === "kanban" ? (
          <TaskKanbanBoard tasks={tasks} />
        ) : (
          <DataTable
            columns={taskColumns}
            data={tasks}
            onRowClick={handleRowClick}
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        )}
      </FadeIn>
    </ModuleLayout>
  );
}
