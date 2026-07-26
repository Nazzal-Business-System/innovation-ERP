import type { Prisma, ProjectMilestone as PrismaProjectMilestone } from "@prisma/client";
import type {
  Project,
  ProjectDetail,
  ProjectMilestone,
  ProjectMilestoneStatus,
  ProjectStatus,
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from "@ierp/shared";

type UserRow = {
  id: string;
  name: string;
  email: string;
  avatarPath?: string | null;
  updatedAt?: Date;
  lastSeenAt?: Date | null;
  lastActiveAt?: Date | null;
} | null;
type CustomerRow = { id: string; code: string; name: string } | null;

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  customerId: string | null;
  customer: CustomerRow;
  managerId: string | null;
  manager: UserRow;
  startDate: Date | null;
  targetDate: Date | null;
  status: string;
  progress: number;
  budget: Prisma.Decimal;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tasks: number; milestones: number };
};

type TaskRow = {
  id: string;
  projectId: string;
  title: string;
  assigneeId: string | null;
  assignee: UserRow;
  priority: string;
  dueDate: Date | null;
  status: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: { code: string; name: string };
};

type MilestoneRow = {
  id: string;
  projectId: string;
  title: string;
  dueDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  project?: { code: string; name: string };
};

export function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function serializeUser(user: UserRow): ProjectTask["assignee"] {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath && user.updatedAt ? user.updatedAt.toISOString() : null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

export function serializeProject(project: ProjectRow): Project {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    customerId: project.customerId,
    customer: project.customer
      ? { id: project.customer.id, code: project.customer.code, name: project.customer.name }
      : null,
    managerId: project.managerId,
    manager: serializeUser(project.manager),
    startDate: project.startDate?.toISOString().slice(0, 10) ?? null,
    targetDate: project.targetDate?.toISOString().slice(0, 10) ?? null,
    status: project.status as ProjectStatus,
    progress: project.progress,
    budget: formatMoney(project.budget),
    notes: project.notes,
    taskCount: project._count?.tasks,
    milestoneCount: project._count?.milestones,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function serializeProjectDetail(
  project: ProjectRow & { tasks: TaskRow[]; milestones: MilestoneRow[] }
): ProjectDetail {
  return {
    ...serializeProject(project),
    tasks: project.tasks.map(serializeTask),
    milestones: project.milestones.map(serializeMilestone),
  };
}

export function serializeTask(task: TaskRow): ProjectTask {
  return {
    id: task.id,
    projectId: task.projectId,
    projectCode: task.project?.code,
    projectName: task.project?.name,
    title: task.title,
    assigneeId: task.assigneeId,
    assignee: serializeUser(task.assignee),
    priority: task.priority as ProjectTaskPriority,
    dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
    status: task.status as ProjectTaskStatus,
    description: task.description,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function serializeMilestone(milestone: MilestoneRow | PrismaProjectMilestone): ProjectMilestone {
  const project = "project" in milestone ? milestone.project : undefined;
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    projectCode: project?.code,
    projectName: project?.name,
    title: milestone.title,
    dueDate: milestone.dueDate?.toISOString().slice(0, 10) ?? null,
    status: milestone.status as ProjectMilestoneStatus,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}
