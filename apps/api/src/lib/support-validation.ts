import { z } from "zod";
import { apiDateNullableSchema } from "./api-date.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ticketsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  source: z.enum(["EMAIL", "PHONE", "PORTAL", "INTERNAL", "WHATSAPP", "OTHER"]).optional(),
  categoryId: z.string().uuid().optional(),
});

export const ticketIdSchema = z.object({
  id: z.string().uuid("Invalid ticket id"),
});

export const createTicketSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  source: z.enum(["EMAIL", "PHONE", "PORTAL", "INTERNAL", "WHATSAPP", "OTHER"]).optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueAt: z.string().optional().nullable(),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    dueAt: apiDateNullableSchema.optional(),
    customerId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.categoryId !== undefined ||
      data.priority !== undefined ||
      data.dueAt !== undefined ||
      data.customerId !== undefined ||
      data.projectId !== undefined,
    { message: "At least one field is required" }
  );

export const updateTicketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELLED"]),
});

export const assignTicketSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1),
  isInternal: z.boolean().optional(),
});

export const categoriesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createCategorySchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined || data.description !== undefined || data.isActive !== undefined,
    { message: "At least one field is required" }
  );

export const categoryIdSchema = z.object({
  id: z.string().uuid("Invalid category id"),
});
