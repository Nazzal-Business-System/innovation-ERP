import { Router } from "express";
import { CRM_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  activitiesListSchema,
  activityIdSchema,
  createActivitySchema,
  createLeadSchema,
  createOpportunitySchema,
  leadIdSchema,
  leadsListSchema,
  opportunitiesListSchema,
  opportunityIdSchema,
  updateActivitySchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
} from "../lib/crm-validation.js";
import { toApiDateUtcNoon } from "../lib/api-date.js";
import {
  assigneeInclude,
  formatMoney,
  serializeActivity,
  serializeActivityDetail,
  serializeAssigneeOption,
  serializeLead,
  serializeLeadDetail,
  serializeOpportunity,
  serializeOpportunityDetail,
} from "../lib/serialize-crm.js";
import { logOpportunityEvent } from "../lib/opportunity-events.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const OPEN_STAGES = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION"] as const;

const leadInclude = {
  assignedTo: { include: assigneeInclude },
  convertedCustomer: true,
} as const;

const leadDetailInclude = {
  ...leadInclude,
  opportunities: {
    orderBy: { createdAt: "desc" as const },
  },
  activities: {
    include: {
      assignedTo: { include: assigneeInclude },
      lead: true,
      opportunity: true,
      customer: true,
    },
    orderBy: { dueDate: "asc" as const },
  },
} as const;

const opportunityInclude = {
  lead: true,
  customer: true,
  assignedTo: { include: assigneeInclude },
} as const;

const opportunityDetailInclude = {
  ...opportunityInclude,
  activities: {
    include: {
      assignedTo: { include: assigneeInclude },
      lead: true,
      opportunity: true,
      customer: true,
    },
    orderBy: { dueDate: "asc" as const },
  },
  events: {
    include: {
      actor: { include: assigneeInclude },
    },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
} as const;

const activityInclude = {
  assignedTo: { include: assigneeInclude },
  lead: true,
  opportunity: true,
  customer: true,
} as const;

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(CRM_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [leads, opportunities, activities] = await Promise.all([
      prisma.lead.findMany({ where: { organizationId: orgId } }),
      prisma.opportunity.findMany({
        where: { organizationId: orgId },
        include: opportunityInclude,
        orderBy: { estimatedValue: "desc" },
      }),
      prisma.crmActivity.findMany({
        where: { organizationId: orgId },
        include: activityInclude,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    const qualifiedLeads = leads.filter((l) => l.status === "QUALIFIED").length;
    const openOpportunities = opportunities.filter((o) =>
      OPEN_STAGES.includes(o.stage as (typeof OPEN_STAGES)[number])
    );

    let pipelineValue = 0;
    let weightedPipelineValue = 0;
    for (const opp of openOpportunities) {
      const val = Number(opp.estimatedValue);
      pipelineValue += val;
      weightedPipelineValue += val * (opp.probability / 100);
    }

    const wonDealsThisMonth = opportunities.filter(
      (o) => o.stage === "WON" && o.updatedAt >= monthStart
    ).length;

    const overdueActivities = activities.filter(
      (a) => !a.completedAt && a.dueDate && a.dueDate < today
    ).length;

    const sourceMap = new Map<string, number>();
    for (const lead of leads) {
      sourceMap.set(lead.source, (sourceMap.get(lead.source) ?? 0) + 1);
    }

    const stageMap = new Map<string, { count: number; totalValue: number }>();
    for (const opp of opportunities) {
      const existing = stageMap.get(opp.stage) ?? { count: 0, totalValue: 0 };
      stageMap.set(opp.stage, {
        count: existing.count + 1,
        totalValue: existing.totalValue + Number(opp.estimatedValue),
      });
    }

    const upcomingActivities = activities
      .filter((a) => !a.completedAt)
      .slice(0, 8)
      .map(serializeActivity);

    const topOpportunities = opportunities
      .filter((o) => OPEN_STAGES.includes(o.stage as (typeof OPEN_STAGES)[number]))
      .slice(0, 6)
      .map(serializeOpportunity);

    res.json({
      totalLeads: leads.length,
      qualifiedLeads,
      openOpportunities: openOpportunities.length,
      pipelineValue: formatMoney(pipelineValue),
      weightedPipelineValue: formatMoney(weightedPipelineValue),
      wonDealsThisMonth,
      overdueActivities,
      leadsBySource: Array.from(sourceMap.entries()).map(([source, count]) => ({
        source,
        count,
      })),
      opportunitiesByStage: Array.from(stageMap.entries()).map(([stage, stats]) => ({
        stage,
        count: stats.count,
        totalValue: formatMoney(stats.totalValue),
      })),
      upcomingActivities,
      topOpportunities,
    });
  })
);

router.get(
  "/assignees",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const users = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        userRoles: {
          some: {
            role: {
              OR: [
                { code: { contains: "SALES", mode: "insensitive" } },
                { code: { contains: "CRM", mode: "insensitive" } },
                { code: { contains: "ADMIN", mode: "insensitive" } },
                { code: { contains: "CEO", mode: "insensitive" } },
                {
                  rolePermissions: {
                    some: {
                      permission: {
                        OR: [CRM_PERMISSIONS.READ, CRM_PERMISSIONS.WRITE].map((permKey) => {
                          const [section, action] = permKey.split(".");
                          return { section, action };
                        }),
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      include: assigneeInclude,
      orderBy: { name: "asc" },
      take: 50,
    });

    // Fallback: if role filters yield nobody (permission keys vary), return active org users.
    const data =
      users.length > 0
        ? users
        : await prisma.user.findMany({
            where: {
              organizationId: orgId,
              isActive: true,
              ...(search
                ? {
                    OR: [
                      { name: { contains: search, mode: "insensitive" as const } },
                      { email: { contains: search, mode: "insensitive" as const } },
                    ],
                  }
                : {}),
            },
            include: assigneeInclude,
            orderBy: { name: "asc" },
            take: 50,
          });

    res.json({ data: data.map(serializeAssigneeOption) });
  })
);

router.get(
  "/leads",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = leadsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, source } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
      ...(search
        ? {
            OR: [
              { leadNumber: { contains: search, mode: "insensitive" as const } },
              { companyName: { contains: search, mode: "insensitive" as const } },
              { contactName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      data: leads.map(serializeLead),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/leads/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = leadIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid lead id" });
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: leadDetailInclude,
    });

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json(serializeLeadDetail(lead));
  })
);

router.post(
  "/leads",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.lead.count({ where: { organizationId: orgId } });
    const leadNumber = `LD-2026-${String(count + 1).padStart(4, "0")}`;

    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        leadNumber,
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        email: parsed.data.email || null,
        phone: parsed.data.phone ?? null,
        city: parsed.data.city,
        source: parsed.data.source,
        estimatedValue: parsed.data.estimatedValue,
        assignedToId: parsed.data.assignedToId ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: leadDetailInclude,
    });

    res.status(201).json(serializeLeadDetail(lead));
  })
);

router.patch(
  "/leads/:id",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = leadIdSchema.safeParse(req.params);
    const bodyParsed = updateLeadSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.lead.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: body.assignedToId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({
          error: "Assigned user must be an active user in this organization",
          code: "INVALID_ASSIGNEE",
        });
        return;
      }
    }

    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
        ...(body.email !== undefined ? { email: body.email || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.source !== undefined ? { source: body.source } : {}),
        ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
        ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: leadDetailInclude,
    });

    res.json(serializeLeadDetail(lead));
  })
);

router.patch(
  "/leads/:id/status",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = leadIdSchema.safeParse(req.params);
    const bodyParsed = updateLeadStatusSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.lead.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    if (existing.status === "CONVERTED" || existing.status === "LOST") {
      res.status(400).json({ error: `Cannot change status from ${existing.status}` });
      return;
    }

    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: { status: bodyParsed.data.status },
      include: leadDetailInclude,
    });

    res.json(serializeLeadDetail(lead));
  })
);

router.get(
  "/opportunities",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = opportunitiesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, stage, leadId, customerId, openOnly } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(stage ? { stage } : openOnly ? { stage: { in: [...OPEN_STAGES] } } : {}),
      ...(leadId ? { leadId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { opportunityNumber: { contains: search, mode: "insensitive" as const } },
              { title: { contains: search, mode: "insensitive" as const } },
              { lead: { companyName: { contains: search, mode: "insensitive" as const } } },
              { customer: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: opportunityInclude,
        orderBy: { expectedCloseDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
    ]);

    res.json({
      data: opportunities.map(serializeOpportunity),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/opportunities/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = opportunityIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid opportunity id" });
      return;
    }

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: opportunityDetailInclude,
    });

    if (!opportunity) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    res.json(serializeOpportunityDetail(opportunity));
  })
);

router.post(
  "/opportunities",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createOpportunitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const {
      title,
      leadId,
      customerId,
      confirmDuplicate,
      stage,
      estimatedValue,
      probability,
      expectedCloseDate,
      assignedToId,
      notes,
    } = parsed.data;

    let leadRecord: {
      id: string;
      status: string;
      convertedCustomerId: string | null;
    } | null = null;

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: orgId },
        select: { id: true, status: true, convertedCustomerId: true },
      });
      if (!lead) {
        res.status(400).json({ error: "Lead not found in this organization", code: "INVALID_LEAD" });
        return;
      }
      if (lead.status === "LOST") {
        res.status(400).json({ error: "Cannot create an opportunity from a lost lead", code: "LEAD_LOST" });
        return;
      }
      if (lead.status === "CONVERTED") {
        res.status(400).json({
          error: "Lead is already converted. Create the opportunity from the customer instead.",
          code: "LEAD_CONVERTED",
        });
        return;
      }
      leadRecord = lead;

      const openOpportunities = await prisma.opportunity.findMany({
        where: {
          organizationId: orgId,
          leadId: lead.id,
          stage: { in: [...OPEN_STAGES] },
        },
        select: {
          id: true,
          opportunityNumber: true,
          title: true,
          stage: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (openOpportunities.length > 0 && !confirmDuplicate) {
        res.status(409).json({
          error: "This lead already has an open opportunity",
          code: "OPEN_OPPORTUNITY_EXISTS",
          existingOpportunities: openOpportunities,
        });
        return;
      }
    }

    let resolvedCustomerId = customerId ?? null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId },
        select: { id: true, isActive: true },
      });
      if (!customer) {
        res.status(400).json({
          error: "Customer not found in this organization",
          code: "INVALID_CUSTOMER",
        });
        return;
      }
      if (!customer.isActive) {
        res.status(400).json({
          error: "Cannot create an opportunity for an inactive customer",
          code: "CUSTOMER_INACTIVE",
        });
        return;
      }
      resolvedCustomerId = customer.id;
    } else if (leadRecord?.convertedCustomerId) {
      resolvedCustomerId = leadRecord.convertedCustomerId;
    }

    if (!assignedToId) {
      res.status(400).json({ error: "Assigned To is required", code: "ASSIGNEE_REQUIRED" });
      return;
    }

    const assignee = await prisma.user.findFirst({
      where: { id: assignedToId, organizationId: orgId, isActive: true },
      select: { id: true, name: true },
    });
    if (!assignee) {
      res.status(400).json({
        error: "Assigned user must be an active user in this organization",
        code: "INVALID_ASSIGNEE",
      });
      return;
    }

    const count = await prisma.opportunity.count({ where: { organizationId: orgId } });
    const opportunityNumber = `OP-2026-${String(count + 1).padStart(4, "0")}`;
    const actorId = req.user!.userId;

    const opportunity = await prisma.$transaction(async (tx) => {
      const created = await tx.opportunity.create({
        data: {
          organizationId: orgId,
          opportunityNumber,
          title,
          leadId: leadRecord?.id ?? null,
          customerId: resolvedCustomerId,
          stage: stage ?? "PROSPECTING",
          estimatedValue,
          probability: probability ?? 10,
          expectedCloseDate: expectedCloseDate
            ? new Date(`${expectedCloseDate.slice(0, 10)}T12:00:00.000Z`)
            : null,
          assignedToId: assignee.id,
          notes: notes ?? null,
        },
        include: opportunityDetailInclude,
      });

      if (leadRecord && (leadRecord.status === "NEW" || leadRecord.status === "CONTACTED")) {
        await tx.lead.update({
          where: { id: leadRecord.id },
          data: { status: "QUALIFIED" },
        });
      }

      await logOpportunityEvent(tx, {
        organizationId: orgId,
        opportunityId: created.id,
        type: "CREATED",
        summary: `Opportunity created and assigned to ${assignee.name}`,
        actorId,
      });

      return tx.opportunity.findFirstOrThrow({
        where: { id: created.id },
        include: opportunityDetailInclude,
      });
    });

    res.status(201).json(serializeOpportunityDetail(opportunity));
  })
);

router.patch(
  "/opportunities/:id",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const actorId = req.user!.userId;
    const paramsParsed = opportunityIdSchema.safeParse(req.params);
    const bodyParsed = updateOpportunitySchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.opportunity.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
      include: { assignedTo: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    const body = bodyParsed.data;

    if (
      body.stage !== undefined &&
      body.stage !== existing.stage &&
      (existing.stage === "WON" || existing.stage === "LOST")
    ) {
      res.status(400).json({ error: `Cannot change stage from ${existing.stage}` });
      return;
    }

    let assigneeName: string | null = null;
    if (body.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: body.assignedToId, organizationId: orgId, isActive: true },
        select: { id: true, name: true },
      });
      if (!assignee) {
        res.status(400).json({
          error: "Assigned user must be an active user in this organization",
          code: "INVALID_ASSIGNEE",
        });
        return;
      }
      assigneeName = assignee.name;
    }

    const opportunity = await prisma.$transaction(async (tx) => {
      const updated = await tx.opportunity.update({
        where: { id: existing.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
          ...(body.stage !== undefined ? { stage: body.stage } : {}),
          ...(body.estimatedValue !== undefined ? { estimatedValue: body.estimatedValue } : {}),
          ...(body.probability !== undefined ? { probability: body.probability } : {}),
          ...(body.expectedCloseDate !== undefined
            ? {
                expectedCloseDate: body.expectedCloseDate
                  ? new Date(`${body.expectedCloseDate.slice(0, 10)}T12:00:00.000Z`)
                  : null,
              }
            : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (body.title !== undefined && body.title !== existing.title) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "TITLE_UPDATED",
          summary: "Opportunity title updated",
          details: `${existing.title} → ${body.title}`,
          actorId,
        });
      }
      if (body.assignedToId !== undefined && body.assignedToId !== existing.assignedToId) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "OWNER_CHANGED",
          summary: `Owner changed to ${assigneeName ?? "unassigned"}`,
          details: existing.assignedTo?.name
            ? `${existing.assignedTo.name} → ${assigneeName}`
            : undefined,
          actorId,
        });
      }
      if (body.stage !== undefined && body.stage !== existing.stage) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "STAGE_CHANGED",
          summary: `Stage changed to ${body.stage.replace(/_/g, " ")}`,
          details: `${existing.stage} → ${body.stage}`,
          actorId,
        });
      }
      if (
        body.estimatedValue !== undefined &&
        Number(existing.estimatedValue) !== body.estimatedValue
      ) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "VALUE_UPDATED",
          summary: "Estimated value updated",
          details: `${Number(existing.estimatedValue)} → ${body.estimatedValue}`,
          actorId,
        });
      }
      if (body.probability !== undefined && existing.probability !== body.probability) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "PROBABILITY_UPDATED",
          summary: "Probability updated",
          details: `${existing.probability}% → ${body.probability}%`,
          actorId,
        });
      }
      if (body.expectedCloseDate !== undefined) {
        const prev = existing.expectedCloseDate?.toISOString().slice(0, 10) ?? null;
        const next = body.expectedCloseDate ? body.expectedCloseDate.slice(0, 10) : null;
        if (prev !== next) {
          await logOpportunityEvent(tx, {
            organizationId: orgId,
            opportunityId: existing.id,
            type: "CLOSE_DATE_UPDATED",
            summary: "Expected close date updated",
            details: `${prev ?? "—"} → ${next ?? "—"}`,
            actorId,
          });
        }
      }
      if (body.notes !== undefined && (body.notes ?? "") !== (existing.notes ?? "")) {
        await logOpportunityEvent(tx, {
          organizationId: orgId,
          opportunityId: existing.id,
          type: "NOTES_UPDATED",
          summary: "Notes updated",
          actorId,
        });
      }

      return tx.opportunity.findFirstOrThrow({
        where: { id: updated.id },
        include: opportunityDetailInclude,
      });
    });

    res.json(serializeOpportunityDetail(opportunity));
  })
);

router.patch(
  "/opportunities/:id/stage",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = opportunityIdSchema.safeParse(req.params);
    const bodyParsed = updateOpportunityStageSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.opportunity.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }

    if (existing.stage === "WON" || existing.stage === "LOST") {
      res.status(400).json({ error: `Cannot change stage from ${existing.stage}` });
      return;
    }

    const opportunity = await prisma.$transaction(async (tx) => {
      await tx.opportunity.update({
        where: { id: existing.id },
        data: { stage: bodyParsed.data.stage },
      });
      await logOpportunityEvent(tx, {
        organizationId: orgId,
        opportunityId: existing.id,
        type: "STAGE_CHANGED",
        summary: `Stage changed to ${bodyParsed.data.stage.replace(/_/g, " ")}`,
        details: `${existing.stage} → ${bodyParsed.data.stage}`,
        actorId: req.user!.userId,
      });
      return tx.opportunity.findFirstOrThrow({
        where: { id: existing.id },
        include: opportunityDetailInclude,
      });
    });

    res.json(serializeOpportunityDetail(opportunity));
  })
);

router.get(
  "/activities",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = activitiesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, type, status } = parsed.data;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      organizationId: orgId,
      ...(type ? { type } : {}),
      ...(status === "completed" ? { completedAt: { not: null } } : {}),
      ...(status === "open" ? { completedAt: null } : {}),
      ...(status === "overdue"
        ? { completedAt: null, dueDate: { lt: today } }
        : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { lead: { companyName: { contains: search, mode: "insensitive" as const } } },
              { opportunity: { title: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [activities, total] = await Promise.all([
      prisma.crmActivity.findMany({
        where,
        include: activityInclude,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.crmActivity.count({ where }),
    ]);

    res.json({
      data: activities.map(serializeActivity),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/activities/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = activityIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid activity id" });
      return;
    }

    const activity = await prisma.crmActivity.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: activityInclude,
    });

    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }

    res.json(serializeActivityDetail(activity));
  })
);

router.post(
  "/activities",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const activity = await prisma.crmActivity.create({
      data: {
        organizationId: orgId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        leadId: parsed.data.leadId ?? null,
        opportunityId: parsed.data.opportunityId ?? null,
        customerId: parsed.data.customerId ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assignedToId: parsed.data.assignedToId ?? req.user!.userId,
        notes: parsed.data.notes ?? null,
      },
      include: activityInclude,
    });

    res.status(201).json(serializeActivityDetail(activity));
  })
);

router.patch(
  "/activities/:id",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = activityIdSchema.safeParse(req.params);
    const bodyParsed = updateActivitySchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.crmActivity.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: body.assignedToId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!assignee) {
        res.status(400).json({
          error: "Assigned user must be an active user in this organization",
          code: "INVALID_ASSIGNEE",
        });
        return;
      }
    }

    if (body.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: body.leadId, organizationId: orgId },
        select: { id: true },
      });
      if (!lead) {
        res.status(400).json({ error: "Lead not found in this organization", code: "INVALID_LEAD" });
        return;
      }
    }

    if (body.opportunityId) {
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: body.opportunityId, organizationId: orgId },
        select: { id: true },
      });
      if (!opportunity) {
        res.status(400).json({
          error: "Opportunity not found in this organization",
          code: "INVALID_OPPORTUNITY",
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

    const activity = await prisma.crmActivity.update({
      where: { id: existing.id },
      data: {
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.leadId !== undefined ? { leadId: body.leadId } : {}),
        ...(body.opportunityId !== undefined ? { opportunityId: body.opportunityId } : {}),
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.dueDate !== undefined
          ? { dueDate: body.dueDate ? toApiDateUtcNoon(body.dueDate) : null }
          : {}),
        ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: activityInclude,
    });

    res.json(serializeActivityDetail(activity));
  })
);

router.patch(
  "/activities/:id/complete",
  requirePermission(CRM_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = activityIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid activity id" });
      return;
    }

    const existing = await prisma.crmActivity.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Activity not found" });
      return;
    }

    if (existing.completedAt) {
      res.status(400).json({ error: "Activity already completed" });
      return;
    }

    const activity = await prisma.crmActivity.update({
      where: { id: existing.id },
      data: { completedAt: new Date() },
      include: activityInclude,
    });

    res.json(serializeActivityDetail(activity));
  })
);

export default router;
