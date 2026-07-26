"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  Project,
  ProjectMilestone,
  ProjectMilestoneStatus,
  ProjectStatus,
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@ierp/shared";
import { StatusBadge } from "@/components/data-display/status-badge";
import { UserPersonChip } from "@/components/avatar/person-chips";
import { formatDisplayDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";

function DisplayDate({ value }: { value: string | null | undefined }) {
  const { locale } = useI18n();
  return <>{formatDisplayDate(value, locale)}</>;
}

export function projectStatusVariant(
  status: ProjectStatus
): "active" | "pending" | "info" | "draft" | "inactive" | "error" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "COMPLETED":
      return "info";
    case "ON_HOLD":
      return "pending";
    case "CANCELLED":
      return "error";
    default:
      return "draft";
  }
}

export function taskStatusVariant(
  status: ProjectTaskStatus
): "active" | "pending" | "info" | "draft" {
  switch (status) {
    case "DONE":
      return "active";
    case "IN_PROGRESS":
      return "info";
    case "REVIEW":
      return "pending";
    default:
      return "draft";
  }
}

export function taskPriorityVariant(
  priority: ProjectTaskPriority
): "active" | "pending" | "info" | "draft" | "error" {
  switch (priority) {
    case "CRITICAL":
      return "error";
    case "HIGH":
      return "pending";
    case "MEDIUM":
      return "info";
    default:
      return "draft";
  }
}

export function milestoneStatusVariant(
  status: ProjectMilestoneStatus
): "active" | "pending" | "info" | "draft" | "error" {
  switch (status) {
    case "COMPLETED":
      return "active";
    case "MISSED":
      return "error";
    default:
      return "pending";
  }
}

export const TASK_PRIORITY_LABELS: Record<ProjectTaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const projectColumns: ColumnDef<Project>[] = [
  {
    accessorKey: "code",
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.customer?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={projectStatusVariant(row.original.status)}
        label={row.original.status.replace(/_/g, " ")}
      />
    ),
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--muted-bg)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${row.original.progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums">{row.original.progress}%</span>
      </div>
    ),
  },
  {
    accessorKey: "budget",
    header: "Budget",
    cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.budget}</span>,
  },
  {
    id: "manager",
    header: "Manager",
    cell: ({ row }) => <UserPersonChip user={row.original.manager} />,
  },
  {
    accessorKey: "targetDate",
    header: "Target Date",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]"><DisplayDate value={row.original.targetDate} /></span>
    ),
  },
];

export const taskColumns: ColumnDef<ProjectTask>[] = [
  {
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/tasks/${row.original.id}`}
        className="font-medium text-[var(--accent)] hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "project",
    header: "Project",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {row.original.projectCode ?? row.original.projectName ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => (
      <StatusBadge
        status={taskPriorityVariant(row.original.priority)}
        label={TASK_PRIORITY_LABELS[row.original.priority]}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={taskStatusVariant(row.original.status)}
        label={row.original.status.replace(/_/g, " ")}
      />
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]"><DisplayDate value={row.original.dueDate} /></span>
    ),
  },
  {
    id: "assignee",
    header: "Assignee",
    cell: ({ row }) => <UserPersonChip user={row.original.assignee} />,
  },
];

export const milestoneColumns: ColumnDef<ProjectMilestone>[] = [
  {
    accessorKey: "title",
    header: "Milestone",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: "project",
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/projects/${row.original.projectId}`}
        className="text-sm text-[var(--accent)] hover:underline"
      >
        {row.original.projectCode ?? row.original.projectName ?? "—"}
      </Link>
    ),
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]"><DisplayDate value={row.original.dueDate} /></span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={milestoneStatusVariant(row.original.status)}
        label={row.original.status}
      />
    ),
  },
];
