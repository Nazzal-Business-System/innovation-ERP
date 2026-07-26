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
