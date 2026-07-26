import { Router } from "express";
import { SUPPORT_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  assignTicketSchema,
  categoriesListSchema,
  categoryIdSchema,
  createCategorySchema,
  createCommentSchema,
  createTicketSchema,
  ticketIdSchema,
  ticketsListSchema,
  updateCategorySchema,
  updateTicketSchema,
  updateTicketStatusSchema,
} from "../lib/support-validation.js";
import { toApiDateUtcNoon } from "../lib/api-date.js";
import {
  computeAvgResolutionHours,
  serializeCategory,
  serializeComment,
  serializeTicket,
  serializeTicketDetail,
} from "../lib/serialize-support.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const ticketInclude = {
  customer: true,
  project: true,
  category: true,
  assignedTo: true,
  _count: { select: { comments: true } },
} as const;

const ticketDetailInclude = {
  customer: true,
  project: true,
  category: true,
  assignedTo: true,
  comments: {
    include: { author: true },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const categoryInclude = {
  _count: { select: { tickets: true } },
} as const;

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(SUPPORT_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const today = startOfDay(new Date());

    const tickets = await prisma.supportTicket.findMany({
      where: { organizationId: orgId },
      include: ticketInclude,
      orderBy: { openedAt: "desc" },
    });

    const openTickets = tickets.filter((t) =>
      OPEN_STATUSES.includes(t.status as (typeof OPEN_STATUSES)[number])
    );
    const overdueTickets = openTickets.filter((t) => t.dueAt && t.dueAt < today);
    const criticalTickets = openTickets.filter((t) => t.priority === "CRITICAL");

    const statusMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();
    const categoryMap = new Map<string, { name: string; count: number }>();

    for (const ticket of tickets) {
      statusMap.set(ticket.status, (statusMap.get(ticket.status) ?? 0) + 1);
      priorityMap.set(ticket.priority, (priorityMap.get(ticket.priority) ?? 0) + 1);
      if (ticket.categoryId && ticket.category) {
        const existing = categoryMap.get(ticket.categoryId) ?? {
          name: ticket.category.name,
          count: 0,
        };
        categoryMap.set(ticket.categoryId, { ...existing, count: existing.count + 1 });
      }
    }

    res.json({
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
      criticalTickets: criticalTickets.length,
      avgResolutionHours: computeAvgResolutionHours(tickets),
      ticketsByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      ticketsByPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({
        priority,
        count,
      })),
      ticketsByCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        count: data.count,
      })),
      recentTickets: tickets.slice(0, 8).map((t) => serializeTicket(t)),
      overdueList: overdueTickets.slice(0, 10).map((t) => serializeTicket(t)),
    });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoriesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search, activeOnly } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(activeOnly === true ? { isActive: true } : activeOnly === false ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [categories, total] = await Promise.all([
      prisma.supportCategory.findMany({
        where,
        include: categoryInclude,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.supportCategory.count({ where }),
    ]);

    res.json({
      data: categories.map(serializeCategory),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.post(
  "/categories",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.supportCategory.count({ where: { organizationId: orgId } });
    const code = (parsed.data.code ?? `CAT-${String(count + 1).padStart(3, "0")}`).toUpperCase();

    const existingCode = await prisma.supportCategory.findFirst({
      where: { organizationId: orgId, code },
      select: { id: true },
    });
    if (existingCode) {
      res.status(409).json({ error: "A category with this code already exists" });
      return;
    }

    const category = await prisma.supportCategory.create({
      data: {
        organizationId: orgId,
        code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive ?? true,
      },
      include: categoryInclude,
    });

    res.status(201).json(serializeCategory(category));
  })
);

router.get(
  "/categories/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }

    const category = await prisma.supportCategory.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: categoryInclude,
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(serializeCategory(category));
  })
);

router.patch(
  "/categories/:id",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = categoryIdSchema.safeParse(req.params);
    const bodyParsed = updateCategorySchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.supportCategory.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const body = bodyParsed.data;
    const category = await prisma.supportCategory.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: categoryInclude,
    });

    res.json(serializeCategory(category));
  })
);

router.delete(
  "/categories/:id",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }

    const existing = await prisma.supportCategory.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: categoryInclude,
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const ticketCount = existing._count.tickets;
    if (ticketCount > 0) {
      res.status(409).json({
        error: "Cannot delete a category that still has tickets. Archive it instead.",
        code: "SUPPORT_CATEGORY_NOT_EMPTY",
        details: { ticketCount },
      });
      return;
    }

    await prisma.supportCategory.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

router.get(
  "/tickets",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = ticketsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search, status, priority, source, categoryId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(source ? { source } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: "insensitive" as const } },
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: ticketInclude,
        orderBy: { openedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({
      data: tickets.map((t) => serializeTicket(t)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/tickets/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = ticketIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid ticket id" });
      return;
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: ticketDetailInclude,
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(serializeTicketDetail(ticket));
  })
);

router.post(
  "/tickets",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.supportTicket.count({ where: { organizationId: orgId } });
    const ticketNumber = `TKT-2026-${String(count + 1).padStart(4, "0")}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        customerId: parsed.data.customerId ?? null,
        projectId: parsed.data.projectId ?? null,
        categoryId: parsed.data.categoryId ?? null,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "MEDIUM",
        source: parsed.data.source ?? "INTERNAL",
        assignedToId: parsed.data.assignedToId ?? null,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      },
      include: ticketDetailInclude,
    });

    res.status(201).json(serializeTicketDetail(ticket));
  })
);

router.patch(
  "/tickets/:id",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = ticketIdSchema.safeParse(req.params);
    const bodyParsed = updateTicketSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.supportTicket.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.categoryId) {
      const category = await prisma.supportCategory.findFirst({
        where: { id: body.categoryId, organizationId: orgId },
        select: { id: true },
      });
      if (!category) {
        res.status(400).json({
          error: "Category not found in this organization",
          code: "INVALID_CATEGORY",
        });
        return;
      }
    }

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

    if (body.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, organizationId: orgId },
        select: { id: true },
      });
      if (!project) {
        res.status(400).json({
          error: "Project not found in this organization",
          code: "INVALID_PROJECT",
        });
        return;
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.dueAt !== undefined
          ? { dueAt: body.dueAt ? toApiDateUtcNoon(body.dueAt) : null }
          : {}),
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
      },
      include: ticketDetailInclude,
    });

    res.json(serializeTicketDetail(ticket));
  })
);

router.patch(
  "/tickets/:id/status",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = ticketIdSchema.safeParse(req.params);
    const bodyParsed = updateTicketStatusSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.supportTicket.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const now = new Date();
    const updateData: {
      status: typeof bodyParsed.data.status;
      resolvedAt?: Date | null;
      closedAt?: Date | null;
    } = { status: bodyParsed.data.status };

    if (bodyParsed.data.status === "RESOLVED" && !existing.resolvedAt) {
      updateData.resolvedAt = now;
    }
    if (bodyParsed.data.status === "CLOSED" && !existing.closedAt) {
      updateData.closedAt = now;
      if (!existing.resolvedAt) updateData.resolvedAt = now;
    }
    if (bodyParsed.data.status === "OPEN" || bodyParsed.data.status === "IN_PROGRESS") {
      updateData.resolvedAt = null;
      updateData.closedAt = null;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: paramsParsed.data.id },
      data: updateData,
      include: ticketDetailInclude,
    });

    res.json(serializeTicketDetail(ticket));
  })
);

router.patch(
  "/tickets/:id/assign",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = ticketIdSchema.safeParse(req.params);
    const bodyParsed = assignTicketSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.supportTicket.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: paramsParsed.data.id },
      data: { assignedToId: bodyParsed.data.assignedToId },
      include: ticketDetailInclude,
    });

    res.json(serializeTicketDetail(ticket));
  })
);

router.get(
  "/tickets/:id/comments",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = ticketIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid ticket id" });
      return;
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const comments = await prisma.supportTicketComment.findMany({
      where: { ticketId: parsed.data.id, organizationId: orgId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: comments.map(serializeComment) });
  })
);

router.post(
  "/tickets/:id/comments",
  requirePermission(SUPPORT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = ticketIdSchema.safeParse(req.params);
    const bodyParsed = createCommentSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const comment = await prisma.supportTicketComment.create({
      data: {
        organizationId: orgId,
        ticketId: paramsParsed.data.id,
        authorId: userId,
        body: bodyParsed.data.body,
        isInternal: bodyParsed.data.isInternal ?? false,
      },
      include: { author: true },
    });

    res.status(201).json(serializeComment(comment));
  })
);

export default router;
