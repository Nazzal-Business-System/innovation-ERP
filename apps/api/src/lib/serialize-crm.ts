import type { Prisma } from "@prisma/client";
import type {
  CrmActivity,
  CrmActivityDetail,
  CrmActivityType,
  CrmAssigneeOption,
  CrmLead,
  CrmLeadDetail,
  CrmOpportunity,
  CrmOpportunityDetail,
  CrmOpportunityEvent,
  CrmUserRef,
  LeadSource,
  LeadStatus,
  OpportunityEventType,
  OpportunityStage,
} from "@ierp/shared";

const assigneeInclude = {
  userRoles: {
    include: { role: true },
    take: 3,
  },
} as const;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof assigneeInclude }>;

type LeadWithRelations = Prisma.LeadGetPayload<{
  include: {
    assignedTo: { include: typeof assigneeInclude };
    convertedCustomer: true;
  };
}>;

type LeadDetailPayload = Prisma.LeadGetPayload<{
  include: {
    assignedTo: { include: typeof assigneeInclude };
    convertedCustomer: true;
    opportunities: true;
    activities: {
      include: {
        assignedTo: { include: typeof assigneeInclude };
        lead: true;
        opportunity: true;
        customer: true;
      };
    };
  };
}>;

type OpportunityWithRelations = Prisma.OpportunityGetPayload<{
  include: {
    lead: true;
    customer: true;
    assignedTo: { include: typeof assigneeInclude };
  };
}>;

type OpportunityEventPayload = Prisma.OpportunityEventGetPayload<{
  include: {
    actor: { include: typeof assigneeInclude };
  };
}>;

type OpportunityDetailPayload = Prisma.OpportunityGetPayload<{
  include: {
    lead: true;
    customer: true;
    assignedTo: { include: typeof assigneeInclude };
    activities: {
      include: {
        assignedTo: { include: typeof assigneeInclude };
        lead: true;
        opportunity: true;
        customer: true;
      };
    };
    events: {
      include: {
        actor: { include: typeof assigneeInclude };
      };
    };
  };
}>;

type ActivityWithRelations = Prisma.CrmActivityGetPayload<{
  include: {
    assignedTo: { include: typeof assigneeInclude };
    lead: true;
    opportunity: true;
    customer: true;
  };
}>;

function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isOverdue(dueDate: Date | null, completedAt: Date | null): boolean {
  if (!dueDate || completedAt) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function serializeUserRef(
  user: {
    id: string;
    name: string;
    email?: string | null;
    avatarPath?: string | null;
    updatedAt?: Date;
    lastSeenAt?: Date | null;
    lastActiveAt?: Date | null;
    userRoles?: UserWithRoles["userRoles"];
  } | null
): CrmUserRef | null {
  if (!user) return null;
  const role = user.userRoles?.[0]?.role?.name ?? null;
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? null,
    role,
    initials: initialsFromName(user.name),
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath && user.updatedAt ? user.updatedAt.toISOString() : null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

export function serializeAssigneeOption(user: UserWithRoles): CrmAssigneeOption {
  return {
    ...(serializeUserRef(user) as CrmUserRef),
    isActive: user.isActive,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath ? user.updatedAt.toISOString() : null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

function serializeEvent(event: OpportunityEventPayload): CrmOpportunityEvent {
  return {
    id: event.id,
    type: event.type as OpportunityEventType,
    summary: event.summary,
    details: event.details,
    actor: serializeUserRef(event.actor),
    createdAt: event.createdAt.toISOString(),
  };
}

export function serializeActivity(activity: ActivityWithRelations): CrmActivity {
  return {
    id: activity.id,
    type: activity.type as CrmActivityType,
    subject: activity.subject,
    dueDate: activity.dueDate?.toISOString().slice(0, 10) ?? null,
    completedAt: activity.completedAt?.toISOString() ?? null,
    isCompleted: Boolean(activity.completedAt),
    isOverdue: isOverdue(activity.dueDate, activity.completedAt),
    notes: activity.notes,
    lead: activity.lead
      ? {
          id: activity.lead.id,
          leadNumber: activity.lead.leadNumber,
          companyName: activity.lead.companyName,
        }
      : null,
    opportunity: activity.opportunity
      ? {
          id: activity.opportunity.id,
          opportunityNumber: activity.opportunity.opportunityNumber,
          title: activity.opportunity.title,
        }
      : null,
    customer: activity.customer
      ? { id: activity.customer.id, code: activity.customer.code, name: activity.customer.name }
      : null,
    assignedTo: serializeUserRef(activity.assignedTo),
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

export function serializeActivityDetail(activity: ActivityWithRelations): CrmActivityDetail {
  return {
    ...serializeActivity(activity),
    canComplete: !activity.completedAt,
  };
}

export function serializeLead(lead: LeadWithRelations): CrmLead {
  return {
    id: lead.id,
    leadNumber: lead.leadNumber,
    companyName: lead.companyName,
    contactName: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    source: lead.source as LeadSource,
    status: lead.status as LeadStatus,
    estimatedValue: formatMoney(lead.estimatedValue),
    notes: lead.notes,
    assignedTo: serializeUserRef(lead.assignedTo),
    convertedCustomer: lead.convertedCustomer
      ? {
          id: lead.convertedCustomer.id,
          code: lead.convertedCustomer.code,
          name: lead.convertedCustomer.name,
        }
      : null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export function serializeLeadDetail(lead: LeadDetailPayload): CrmLeadDetail {
  const base = serializeLead(lead);
  return {
    ...base,
    activities: lead.activities.map(serializeActivity),
    opportunities: lead.opportunities.map((opp) => ({
      id: opp.id,
      opportunityNumber: opp.opportunityNumber,
      title: opp.title,
      stage: opp.stage as OpportunityStage,
      estimatedValue: formatMoney(opp.estimatedValue),
    })),
    canChangeStatus: lead.status !== "CONVERTED" && lead.status !== "LOST",
  };
}

export function serializeOpportunity(opp: OpportunityWithRelations): CrmOpportunity {
  const value = Number(opp.estimatedValue);
  const weighted = value * (opp.probability / 100);
  return {
    id: opp.id,
    opportunityNumber: opp.opportunityNumber,
    title: opp.title,
    stage: opp.stage as OpportunityStage,
    estimatedValue: formatMoney(opp.estimatedValue),
    weightedValue: formatMoney(weighted),
    probability: opp.probability,
    expectedCloseDate: opp.expectedCloseDate?.toISOString().slice(0, 10) ?? null,
    notes: opp.notes,
    lead: opp.lead
      ? { id: opp.lead.id, leadNumber: opp.lead.leadNumber, companyName: opp.lead.companyName }
      : null,
    customer: opp.customer
      ? { id: opp.customer.id, code: opp.customer.code, name: opp.customer.name }
      : null,
    assignedTo: serializeUserRef(opp.assignedTo),
    createdAt: opp.createdAt.toISOString(),
    updatedAt: opp.updatedAt.toISOString(),
  };
}

export function serializeOpportunityDetail(opp: OpportunityDetailPayload): CrmOpportunityDetail {
  const base = serializeOpportunity(opp);
  return {
    ...base,
    activities: opp.activities.map(serializeActivity),
    timeline: (opp.events ?? []).map(serializeEvent),
    canChangeStage: opp.stage !== "WON" && opp.stage !== "LOST",
    canEdit: true,
  };
}

export { formatMoney, assigneeInclude };
