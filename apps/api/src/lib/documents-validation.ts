import { z } from "zod";
import { apiDateNullableSchema } from "./api-date.js";

const documentStatusEnum = z.enum(["ACTIVE", "EXPIRED", "ARCHIVED", "PENDING_REVIEW"]);
const documentModuleEnum = z.enum([
  "HR",
  "FINANCE",
  "PROCUREMENT",
  "SALES",
  "SUPPORT",
  "PROJECTS",
  "CRM",
  "OPERATIONS",
  "ACCOUNTING",
  "SYSTEM",
]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const filesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: documentStatusEnum.optional(),
  categoryId: z.string().uuid().optional(),
  module: documentModuleEnum.optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().uuid().optional(),
});

export const fileIdSchema = z.object({
  id: z.string().uuid("Invalid document id"),
});

export const createFileSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  fileName: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  fileSize: z.coerce.number().int().min(0),
  status: documentStatusEnum.optional(),
  expiryDate: z.string().optional().nullable(),
  link: z
    .object({
      module: documentModuleEnum,
      entityType: z.string().trim().min(1),
      entityId: z.string().uuid(),
    })
    .optional()
    .nullable(),
});

export const updateFileSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    expiryDate: apiDateNullableSchema.optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "PENDING_REVIEW"]).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.categoryId !== undefined ||
      data.expiryDate !== undefined ||
      data.status !== undefined,
    { message: "At least one field is required" }
  );

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

export const linksListSchema = paginationSchema.extend({
  module: documentModuleEnum.optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().uuid().optional(),
  documentFileId: z.string().uuid().optional(),
});

export const createLinkSchema = z.object({
  documentFileId: z.string().uuid(),
  module: documentModuleEnum,
  entityType: z.string().trim().min(1),
  entityId: z.string().uuid(),
});

export const linkIdSchema = z.object({
  id: z.string().uuid("Invalid link id"),
});
