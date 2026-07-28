import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  industry: z.string().trim().max(200).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().trim().max(50).nullable().optional(),
});

export const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        value: z.string(),
      })
    )
    .min(1),
});

export const auditLogsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const usersListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  role: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
  presence: z.enum(["online", "away", "offline", "all"]).optional().default("all"),
  sortBy: z.enum(["name", "email", "createdAt", "lastLoginAt"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateRolePermissionsSchema = z.object({
  permissions: z
    .array(
      z.object({
        permissionId: z.string().uuid(),
        granted: z.boolean(),
      })
    )
    .min(1),
});
