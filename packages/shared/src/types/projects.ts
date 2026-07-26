import type { PaginatedResponse } from "./inventory";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectTaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type ProjectTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProjectMilestoneStatus = "PENDING" | "COMPLETED" | "MISSED";

export interface ProjectUserRef {
  id: string;
  name: string;
  email: string;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
}

export interface ProjectCustomerRef {
  id: string;
  code: string;
  name: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string | null;
  customer: ProjectCustomerRef | null;
  managerId: string | null;
  manager: ProjectUserRef | null;
  startDate: string | null;
  targetDate: string | null;
  status: ProjectStatus;
  progress: number;
  budget: string;
  notes: string | null;
  taskCount?: number;
  milestoneCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
}

export interface ProjectTask {
  id: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  title: string;
  assigneeId: string | null;
  assignee: ProjectUserRef | null;
  priority: ProjectTaskPriority;
  dueDate: string | null;
  status: ProjectTaskStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  title: string;
  dueDate: string | null;
  status: ProjectMilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsOverview {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalTasks: number;
  openTasks: number;
  overdueTasks: number;
  upcomingMilestones: number;
  overdueMilestones: number;
  totalBudget: string;
  averageProgress: number;
  projectsByStatus: Array<{ status: ProjectStatus; count: number }>;
  tasksByStatus: Array<{ status: ProjectTaskStatus; count: number }>;
  recentProjects: Project[];
  upcomingMilestonesList: ProjectMilestone[];
}

export interface CreateProjectInput {
  code?: string;
  name: string;
  customerId?: string | null;
  managerId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  status?: ProjectStatus;
  progress?: number;
  budget?: number;
  notes?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  customerId?: string | null;
  managerId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  status?: ProjectStatus;
  progress?: number;
  budget?: number;
  notes?: string | null;
}

export interface CreateProjectTaskInput {
  projectId: string;
  title: string;
  assigneeId?: string | null;
  priority?: ProjectTaskPriority;
  dueDate?: string | null;
  status?: ProjectTaskStatus;
  description?: string | null;
}

export interface UpdateProjectTaskInput {
  title?: string;
  assigneeId?: string | null;
  priority?: ProjectTaskPriority;
  dueDate?: string | null;
  status?: ProjectTaskStatus;
  description?: string | null;
}

export interface CreateProjectMilestoneInput {
  projectId: string;
  title: string;
  dueDate?: string | null;
  status?: ProjectMilestoneStatus;
}

export interface UpdateProjectMilestoneInput {
  title?: string;
  dueDate?: string | null;
  status?: ProjectMilestoneStatus;
}

export type ProjectsListResponse = PaginatedResponse<Project>;
export type ProjectTasksListResponse = PaginatedResponse<ProjectTask>;
export type ProjectMilestonesListResponse = PaginatedResponse<ProjectMilestone>;

export const PROJECTS_PERMISSIONS = {
  READ: "projects.read",
  WRITE: "projects.write",
} as const;
