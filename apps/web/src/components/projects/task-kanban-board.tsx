"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectTask, ProjectTaskStatus } from "@ierp/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import { resolveLinkedUserPresence } from "@/lib/avatar/presence";
import { useUpdateTaskStatus } from "@/lib/hooks/use-projects";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_LABELS, taskPriorityVariant, taskStatusVariant } from "./projects-columns";

const KANBAN_COLUMNS: ProjectTaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

const NEXT_STATUS: Record<ProjectTaskStatus, ProjectTaskStatus> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW",
  REVIEW: "DONE",
  DONE: "TODO",
};

interface TaskKanbanBoardProps {
  tasks: ProjectTask[];
  onTaskUpdated?: () => void;
}

export function TaskKanbanBoard({ tasks, onTaskUpdated }: TaskKanbanBoardProps) {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const updateStatusMutation = useUpdateTaskStatus();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const displayTasks = localTasks;

  const columns = KANBAN_COLUMNS.map((status) => ({
    status,
    items: displayTasks.filter((t) => t.status === status),
  }));

  const moveTask = useCallback(
    async (taskId: string, newStatus: ProjectTaskStatus) => {
      const task = displayTasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      setUpdatingId(taskId);
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      try {
        await updateStatusMutation.mutateAsync({ id: taskId, status: newStatus });
        onTaskUpdated?.();
      } catch {
        setLocalTasks(tasks);
      } finally {
        setUpdatingId(null);
      }
    },
    [displayTasks, onTaskUpdated, tasks, updateStatusMutation]
  );

  function handleDragStart(taskId: string) {
    setDraggingId(taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
  }

  function handleDrop(status: ProjectTaskStatus) {
    if (draggingId) {
      void moveTask(draggingId, status);
      setDraggingId(null);
    }
  }

  function handleCardClick(e: React.MouseEvent, task: ProjectTask) {
    if ((e.target as HTMLElement).closest("[data-status-cycle]")) return;
    const href = `/dashboard/projects/tasks/${task.id}`;
    startNavigation(href);
    router.push(href);
  }

  function handleStatusCycle(e: React.MouseEvent, task: ProjectTask) {
    e.preventDefault();
    e.stopPropagation();
    void moveTask(task.id, NEXT_STATUS[task.status]);
  }

  return (
    <div className="grid gap-4 overflow-x-auto md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => (
        <Card
          key={col.status}
          className="min-w-[220px] border-[var(--border-subtle)] bg-[var(--card)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.status)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <span>{col.status.replace(/_/g, " ")}</span>
              <span className="rounded-full bg-[var(--muted-bg)] px-2 py-0.5 tabular-nums">
                {col.items.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {col.items.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleCardClick(e, task)}
                className={cn(
                  "ierp-card-hover cursor-pointer rounded-lg border border-[var(--border-subtle)] p-3 transition-opacity",
                  draggingId === task.id && "opacity-50",
                  updatingId === task.id && "pointer-events-none opacity-60"
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <button
                    type="button"
                    data-status-cycle
                    onClick={(e) => handleStatusCycle(e, task)}
                    className="ierp-focus-ring shrink-0 cursor-pointer rounded-md p-0.5"
                    title="Cycle status"
                    aria-label="Cycle task status"
                  >
                    <StatusBadge
                      status={taskStatusVariant(task.status)}
                      label={task.status.replace(/_/g, " ")}
                      className="text-[10px]"
                    />
                  </button>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {task.projectCode ?? task.projectName ?? "—"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={taskPriorityVariant(task.priority)}
                    label={TASK_PRIORITY_LABELS[task.priority]}
                    className="text-[10px]"
                  />
                  {task.dueDate && (
                    <span className="text-[10px] text-[var(--muted)]">{task.dueDate}</span>
                  )}
                </div>
                {task.assignee && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <PersonAvatar
                      name={task.assignee.name}
                      source={{
                        kind: "user",
                        userId: task.assignee.id,
                        hasAvatar: task.assignee.hasAvatar,
                        avatarUpdatedAt: task.assignee.avatarUpdatedAt,
                      }}
                      size="xs"
                      presence={resolveLinkedUserPresence({
                        accountUserId: task.assignee.id,
                        lastSeenAt: task.assignee.lastSeenAt,
                        lastActiveAt: task.assignee.lastActiveAt,
                      })}
                      lazy
                    />
                    <p className="truncate text-[10px] text-[var(--muted)]">{task.assignee.name}</p>
                  </div>
                )}
              </div>
            ))}
            {col.items.length === 0 && (
              <p className="py-4 text-center text-xs text-[var(--muted)]">No tasks</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
