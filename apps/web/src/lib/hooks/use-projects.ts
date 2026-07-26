"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  CreateProjectInput,
  CreateProjectMilestoneInput,
  CreateProjectTaskInput,
  PaginatedResponse,
  Project,
  ProjectDetail,
  ProjectMilestone,
  ProjectTask,
  ProjectTaskStatus,
  ProjectsOverview,
  UpdateProjectInput,
  UpdateProjectMilestoneInput,
  UpdateProjectTaskInput,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { assertMutationEntity } from "@/lib/query/assert-mutation-fields";
import { queryKeys } from "@/lib/query/client";
import { keepIfMatchesStatusFilter } from "@/lib/query/optimistic";
import {
  useOptimisticCreateMutation,
  useOptimisticEntityMutation,
} from "@/lib/query/use-optimistic-mutation";

export function useProjectsOverview() {
  return useAsyncData(queryKeys.projects.overview, () => apiFetch<ProjectsOverview>("/projects/overview"), { staleTime: STALE.dashboard });
}

export function useProjects(params: { search?: string; status?: string; page?: number }) {
  const { search, status, page } = params;
  return useAsyncData(["projects-2", search, status, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<Project>>(`/projects/projects${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useProject(id: string) {
  return useAsyncData(queryKeys.projects.detail(id), () => apiFetch<ProjectDetail>(`/projects/projects/${id}`), { staleTime: STALE.operational });
}

export function useProjectTasks(params: {
  search?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const { search, status, priority, projectId, page, limit } = params;
  return useAsyncData(["projects-4", search, status, priority, projectId, page, limit], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (priority) query.set("priority", priority);
    if (projectId) query.set("projectId", projectId);
    if (page) query.set("page", String(page));
    if (limit) query.set("limit", String(limit));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<ProjectTask>>(`/projects/tasks${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useProjectTask(id: string) {
  return useAsyncData(queryKeys.projects.task(id), () => apiFetch<ProjectTask>(`/projects/tasks/${id}`), { staleTime: STALE.operational });
}

export function useProjectMilestones(params: {
  search?: string;
  status?: string;
  projectId?: string;
  page?: number;
}) {
  const { search, status, projectId, page } = params;
  return useAsyncData(["projects-6", search, status, projectId, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (projectId) query.set("projectId", projectId);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<ProjectMilestone>>(
      `/projects/milestones${qs ? `?${qs}` : ""}`
    );
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>("/projects/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
  return apiFetch<ProjectDetail>(`/projects/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function createTask(input: CreateProjectTaskInput): Promise<ProjectTask> {
  return apiFetch<ProjectTask>("/projects/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTask(id: string, input: UpdateProjectTaskInput): Promise<ProjectTask> {
  return apiFetch<ProjectTask>(`/projects/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateTaskStatus(
  id: string,
  status: ProjectTaskStatus
): Promise<ProjectTask> {
  return apiFetch<ProjectTask>(`/projects/tasks/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function createMilestone(
  input: CreateProjectMilestoneInput
): Promise<ProjectMilestone> {
  return apiFetch<ProjectMilestone>("/projects/milestones", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMilestone(
  id: string,
  input: UpdateProjectMilestoneInput
): Promise<ProjectMilestone> {
  return apiFetch<ProjectMilestone>(`/projects/milestones/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function useCreateProject() {
  return useOptimisticCreateMutation<ProjectDetail, CreateProjectInput, ProjectDetail>({
    mutationFn: createProject,
    detailKey: (entity) => queryKeys.projects.detail(entity.id),
    listKeyPrefix: queryKeys.projects.list,
    toEntity: (data) => data,
    shouldIncludeInList: (entity, queryKey) => keepIfMatchesStatusFilter(entity, queryKey),
  });
}

export function useUpdateProject() {
  return useOptimisticEntityMutation<
    ProjectDetail,
    { id: string; input: UpdateProjectInput },
    ProjectDetail
  >({
    mutationFn: ({ id, input }) => updateProject(id, input),
    detailKey: ({ id }) => queryKeys.projects.detail(id),
    listKeyPrefix: queryKeys.projects.list,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    assertResponse: (data, { id, input }) => {
      assertMutationEntity(
        data,
        {
          id,
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        "updateProject"
      );
    },
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...(input.status ? { status: input.status } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id }) => [
      queryKeys.projects.detail(id),
      queryKeys.projects.list,
      queryKeys.projects.overview,
    ],
  });
}

export function useUpdateTask() {
  return useOptimisticEntityMutation<
    ProjectTask,
    { id: string; input: UpdateProjectTaskInput; projectId?: string },
    ProjectTask
  >({
    mutationFn: ({ id, input }) => updateTask(id, input),
    detailKey: ({ id }) => queryKeys.projects.task(id),
    listKeyPrefix: queryKeys.projects.tasks,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      title: input.title ?? current.title,
      description: input.description !== undefined ? input.description : current.description,
      priority: input.priority ?? current.priority,
      assigneeId: input.assigneeId !== undefined ? input.assigneeId : current.assigneeId,
      dueDate: input.dueDate !== undefined ? input.dueDate : current.dueDate,
      status: input.status ?? current.status,
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id, projectId }) => [
      queryKeys.projects.task(id),
      queryKeys.projects.tasks,
      queryKeys.projects.overview,
      ...(projectId ? [queryKeys.projects.detail(projectId)] : []),
    ],
  });
}

export function useUpdateTaskStatus() {
  return useOptimisticEntityMutation<
    ProjectTask,
    { id: string; status: ProjectTaskStatus; projectId?: string },
    ProjectTask
  >({
    mutationFn: ({ id, status }) => updateTaskStatus(id, status),
    detailKey: ({ id }) => queryKeys.projects.task(id),
    listKeyPrefix: queryKeys.projects.tasks,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { status }) => ({ ...current, status }),
    shouldKeepInList: keepIfMatchesStatusFilter,
    reconcileKeys: ({ id, projectId }) => [
      queryKeys.projects.task(id),
      queryKeys.projects.tasks,
      queryKeys.projects.overview,
      ...(projectId ? [queryKeys.projects.detail(projectId)] : []),
    ],
  });
}

export function useCreateTask() {
  return useOptimisticCreateMutation<ProjectTask, CreateProjectTaskInput, ProjectTask>({
    mutationFn: createTask,
    detailKey: (entity) => queryKeys.projects.task(entity.id),
    listKeyPrefix: queryKeys.projects.tasks,
    toEntity: (data) => data,
  });
}

export function useCreateMilestone() {
  return useOptimisticCreateMutation<
    ProjectMilestone,
    CreateProjectMilestoneInput,
    ProjectMilestone
  >({
    mutationFn: createMilestone,
    detailKey: (entity) => ["projects-milestone", entity.id],
    listKeyPrefix: queryKeys.projects.milestones,
    toEntity: (data) => data,
  });
}

export function useUpdateMilestone() {
  return useOptimisticEntityMutation<
    ProjectMilestone,
    { id: string; input: UpdateProjectMilestoneInput },
    ProjectMilestone
  >({
    mutationFn: ({ id, input }) => updateMilestone(id, input),
    detailKey: ({ id }) => ["projects-milestone", id],
    listKeyPrefix: queryKeys.projects.milestones,
    getId: ({ id }) => id,
    toEntity: (data) => data,
    optimisticUpdate: (current, { input }) => ({
      ...current,
      ...input,
      status: (input.status ?? current.status) as ProjectMilestone["status"],
    }),
    shouldKeepInList: keepIfMatchesStatusFilter,
  });
}
