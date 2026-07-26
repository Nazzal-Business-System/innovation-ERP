import { Router } from "express";
import { PROJECTS_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  createMilestoneSchema,
  createProjectSchema,
  createTaskSchema,
  milestoneIdSchema,
  milestonesListSchema,
  projectIdSchema,
  projectsListSchema,
  taskIdSchema,
  tasksListSchema,
  updateMilestoneSchema,
  updateProjectSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../lib/projects-validation.js";
import { compareApiDateStrings, toApiDateUtcNoon } from "../lib/api-date.js";
import {
  formatMoney,
  serializeMilestone,
  serializeProject,
  serializeProjectDetail,
  serializeTask,
} from "../lib/serialize-projects.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const projectInclude = {
  customer: true,
  manager: true,
  _count: { select: { tasks: true, milestones: true } },
} as const;

const projectDetailInclude = {
  customer: true,
  manager: true,
  tasks: { include: { assignee: true }, orderBy: { createdAt: "asc" as const } },
  milestones: { orderBy: { dueDate: "asc" as const } },
} as const;

const taskInclude = {
  assignee: true,
  project: { select: { code: true, name: true } },
} as const;

const milestoneInclude = {
  project: { select: { code: true, name: true } },
} as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(PROJECTS_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const today = startOfDay(new Date());

    const [projects, tasks, milestones, upcomingMilestonesList] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId: orgId },
        include: projectInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.projectTask.findMany({ where: { organizationId: orgId } }),
      prisma.projectMilestone.findMany({ where: { organizationId: orgId } }),
      prisma.projectMilestone.findMany({
        where: {
          organizationId: orgId,
          status: "PENDING",
          dueDate: { gte: today },
        },
        include: milestoneInclude,
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const onHoldProjects = projects.filter((p) => p.status === "ON_HOLD").length;

    const openTasks = tasks.filter((t) => t.status !== "DONE").length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && t.dueDate < today
    ).length;

    const upcomingMilestones = milestones.filter(
      (m) => m.status === "PENDING" && m.dueDate && m.dueDate >= today
    ).length;
    const overdueMilestones = milestones.filter(
      (m) =>
        m.status === "MISSED" || (m.status === "PENDING" && m.dueDate && m.dueDate < today)
    ).length;

    let totalBudget = 0;
    let totalProgress = 0;
    for (const project of projects) {
      totalBudget += Number(project.budget);
      totalProgress += project.progress;
    }

    const projectStatusMap = new Map<string, number>();
    for (const project of projects) {
      projectStatusMap.set(project.status, (projectStatusMap.get(project.status) ?? 0) + 1);
    }

    const taskStatusMap = new Map<string, number>();
    for (const task of tasks) {
      taskStatusMap.set(task.status, (taskStatusMap.get(task.status) ?? 0) + 1);
    }

    res.json({
      totalProjects: projects.length,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalTasks: tasks.length,
      openTasks,
      overdueTasks,
      upcomingMilestones,
      overdueMilestones,
      totalBudget: formatMoney(totalBudget),
      averageProgress: projects.length > 0 ? Math.round(totalProgress / projects.length) : 0,
      projectsByStatus: Array.from(projectStatusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      tasksByStatus: Array.from(taskStatusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      recentProjects: projects.slice(0, 5).map(serializeProject),
      upcomingMilestonesList: upcomingMilestonesList.map(serializeMilestone),
    });
  })
);

router.get(
  "/projects",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = projectsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { customer: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      data: projects.map(serializeProject),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/projects/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = projectIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid project id" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: projectDetailInclude,
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(serializeProjectDetail(project));
  })
);

router.post(
  "/projects",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    let code = parsed.data.code;
    if (!code) {
      const count = await prisma.project.count({ where: { organizationId: orgId } });
      code = `PRJ-2026-${String(count + 1).padStart(4, "0")}`;
    }

    const project = await prisma.project.create({
      data: {
        organizationId: orgId,
        code,
        name: parsed.data.name,
        customerId: parsed.data.customerId ?? null,
        managerId: parsed.data.managerId ?? null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
        status: parsed.data.status ?? "PLANNING",
        progress: parsed.data.progress ?? 0,
        budget: parsed.data.budget ?? 0,
        notes: parsed.data.notes ?? null,
      },
      include: projectDetailInclude,
    });

    res.status(201).json(serializeProjectDetail(project));
  })
);

router.patch(
  "/projects/:id",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = projectIdSchema.safeParse(req.params);
    const bodyParsed = updateProjectSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.project.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, organizationId: orgId },
        select: { id: true },
      });
      if (!customer) {
        res.status(400).json({
          error: "Customer not found in this organization",
          code: "INVALID_CUSTOMER",
        });
        return;
      }
    }

    if (body.managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: body.managerId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!manager) {
        res.status(400).json({
          error: "Manager must be an active user in this organization",
          code: "INVALID_MANAGER",
        });
        return;
      }
    }

    const nextStart =
      body.startDate !== undefined
        ? body.startDate
        : (existing.startDate?.toISOString().slice(0, 10) ?? null);
    const nextTarget =
      body.targetDate !== undefined
        ? body.targetDate
        : (existing.targetDate?.toISOString().slice(0, 10) ?? null);

    if (nextStart && nextTarget && compareApiDateStrings(nextStart, nextTarget) > 0) {
      res.status(400).json({ error: "startDate must be on or before targetDate" });
      return;
    }

    const { startDate, targetDate, ...rest } = body;

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(startDate !== undefined
          ? { startDate: startDate ? toApiDateUtcNoon(startDate) : null }
          : {}),
        ...(targetDate !== undefined
          ? { targetDate: targetDate ? toApiDateUtcNoon(targetDate) : null }
          : {}),
      },
      include: projectDetailInclude,
    });

    res.json(serializeProjectDetail(project));
  })
);

router.get(
  "/tasks",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = tasksListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, priority, projectId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(projectId ? { projectId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { project: { code: { contains: search, mode: "insensitive" as const } } },
              { project: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [tasks, total] = await Promise.all([
      prisma.projectTask.findMany({
        where,
        include: taskInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.projectTask.count({ where }),
    ]);

    res.json({
      data: tasks.map(serializeTask),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/tasks/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = taskIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }

    const task = await prisma.projectTask.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: taskInclude,
    });

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(serializeTask(task));
  })
);

router.post(
  "/tasks",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, organizationId: orgId },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const task = await prisma.projectTask.create({
      data: {
        organizationId: orgId,
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        assigneeId: parsed.data.assigneeId ?? null,
        priority: parsed.data.priority ?? "MEDIUM",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: parsed.data.status ?? "TODO",
        description: parsed.data.description ?? null,
      },
      include: taskInclude,
    });

    res.status(201).json(serializeTask(task));
  })
);

router.patch(
  "/tasks/:id/status",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = taskIdSchema.safeParse(req.params);
    const bodyParsed = updateTaskStatusSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.projectTask.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = await prisma.projectTask.update({
      where: { id: existing.id },
      data: { status: bodyParsed.data.status },
      include: taskInclude,
    });

    res.json(serializeTask(task));
  })
);

router.patch(
  "/tasks/:id",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = taskIdSchema.safeParse(req.params);
    const bodyParsed = updateTaskSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.projectTask.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: body.assigneeId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({
          error: "Assignee must be an active user in this organization",
          code: "INVALID_ASSIGNEE",
        });
        return;
      }
    }

    const { dueDate, ...rest } = body;

    const task = await prisma.projectTask.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(dueDate !== undefined
          ? { dueDate: dueDate ? toApiDateUtcNoon(dueDate) : null }
          : {}),
      },
      include: taskInclude,
    });

    res.json(serializeTask(task));
  })
);

router.get(
  "/milestones",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = milestonesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, projectId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { project: { code: { contains: search, mode: "insensitive" as const } } },
              { project: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [milestones, total] = await Promise.all([
      prisma.projectMilestone.findMany({
        where,
        include: milestoneInclude,
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.projectMilestone.count({ where }),
    ]);

    res.json({
      data: milestones.map(serializeMilestone),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.post(
  "/milestones",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: parsed.data.projectId, organizationId: orgId },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        organizationId: orgId,
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        status: parsed.data.status ?? "PENDING",
      },
      include: milestoneInclude,
    });

    res.status(201).json(serializeMilestone(milestone));
  })
);

router.patch(
  "/milestones/:id",
  requirePermission(PROJECTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = milestoneIdSchema.safeParse(req.params);
    const bodyParsed = updateMilestoneSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.projectMilestone.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const { dueDate, ...rest } = bodyParsed.data;

    const milestone = await prisma.projectMilestone.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
      include: milestoneInclude,
    });

    res.json(serializeMilestone(milestone));
  })
);

export default router;
