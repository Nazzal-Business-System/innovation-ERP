import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const categoriesListSchema = z.object({
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createCategorySchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
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

export const articlesListSchema = paginationSchema.extend({
  search: z.string().max(120).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  visibility: z.enum(["INTERNAL", "PUBLIC", "SUPPORT_ONLY"]).optional(),
});

export const articleIdSchema = z.object({
  id: z.string().uuid(),
});

export const createArticleSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional().nullable(),
  content: z.string().min(1).max(50000),
  categoryId: z.string().uuid().optional().nullable(),
  visibility: z.enum(["INTERNAL", "PUBLIC", "SUPPORT_ONLY"]).optional(),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
  tags: z.array(z.string().min(1).max(40)).max(12).optional(),
});

export const updateArticleSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    summary: z.string().max(500).nullable().optional(),
    content: z.string().min(1).max(50000).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    visibility: z.enum(["INTERNAL", "PUBLIC", "SUPPORT_ONLY"]).optional(),
    status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]).optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.summary !== undefined ||
      data.content !== undefined ||
      data.categoryId !== undefined ||
      data.visibility !== undefined ||
      data.status !== undefined ||
      data.tags !== undefined,
    { message: "At least one field is required" }
  );

export const ticketArticlesSchema = z.object({
  supportTicketId: z.string().uuid(),
});
