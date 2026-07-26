import { z } from "zod";
import { apiDateNullableSchema } from "./api-date.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leadsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST", "CONVERTED"]).optional(),
  source: z
    .enum(["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "FIELD_SALES", "EVENT", "OTHER"])
    .optional(),
});

export const leadIdSchema = z.object({
  id: z.string().uuid("Invalid lead id"),
});

export const createLeadSchema = z.object({
  companyName: z.string().trim().min(1),
  contactName: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  city: z.string().trim().min(1),
  source: z.enum(["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "FIELD_SALES", "EVENT", "OTHER"]),
  estimatedValue: z.coerce.number().min(0),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
});

export const updateLeadSchema = z
  .object({
    companyName: z.string().trim().min(1).optional(),
    contactName: z.string().trim().min(1).optional(),
    email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
    phone: z.string().trim().nullable().optional(),
    city: z.string().trim().min(1).optional(),
    source: z
      .enum(["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "FIELD_SALES", "EVENT", "OTHER"])
      .optional(),
    estimatedValue: z.coerce.number().min(0).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.companyName !== undefined ||
      data.contactName !== undefined ||
      data.email !== undefined ||
      data.phone !== undefined ||
      data.city !== undefined ||
      data.source !== undefined ||
      data.estimatedValue !== undefined ||
      data.assignedToId !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  );

export const updateLeadStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "LOST", "CONVERTED"]),
});

export const opportunitiesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  stage: z
    .enum(["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
    .optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  /** Open pipeline stages only (excludes WON/LOST). */
  openOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true"),
});

export const opportunityIdSchema = z.object({
  id: z.string().uuid("Invalid opportunity id"),
});

export const createOpportunitySchema = z
  .object({
    title: z.string().trim().min(1),
    leadId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    confirmDuplicate: z.boolean().optional(),
    stage: z
      .enum(["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
      .optional(),
    estimatedValue: z.coerce.number().min(0),
    probability: z.coerce.number().int().min(0).max(100).optional(),
    expectedCloseDate: z.string().optional(),
    assignedToId: z.string().uuid(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.leadId && !data.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either leadId or customerId is required",
        path: ["leadId"],
      });
    }
  });

export const updateOpportunitySchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    assignedToId: z.string().uuid().optional(),
    stage: z
      .enum(["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
      .optional(),
    estimatedValue: z.coerce.number().min(0).optional(),
    probability: z.coerce.number().int().min(0).max(100).optional(),
    expectedCloseDate: z.string().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.assignedToId !== undefined ||
      data.stage !== undefined ||
      data.estimatedValue !== undefined ||
      data.probability !== undefined ||
      data.expectedCloseDate !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  );

export const updateOpportunityStageSchema = z.object({
  stage: z.enum(["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
});

export const activitiesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "TASK", "FOLLOW_UP"]).optional(),
  status: z.enum(["open", "completed", "overdue"]).optional(),
});

export const activityIdSchema = z.object({
  id: z.string().uuid("Invalid activity id"),
});

export const createActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "TASK", "FOLLOW_UP"]),
  subject: z.string().trim().min(1),
  leadId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  notes: z.string().trim().optional(),
});

export const updateActivitySchema = z
  .object({
    type: z.enum(["CALL", "EMAIL", "MEETING", "TASK", "FOLLOW_UP"]).optional(),
    subject: z.string().trim().min(1).optional(),
    leadId: z.string().uuid().nullable().optional(),
    opportunityId: z.string().uuid().nullable().optional(),
    customerId: z.string().uuid().nullable().optional(),
    dueDate: apiDateNullableSchema.optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.type !== undefined ||
      data.subject !== undefined ||
      data.leadId !== undefined ||
      data.opportunityId !== undefined ||
      data.customerId !== undefined ||
      data.dueDate !== undefined ||
      data.assignedToId !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  );
