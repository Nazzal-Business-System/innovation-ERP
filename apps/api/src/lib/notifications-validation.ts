import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationsListSchema = paginationSchema.extend({
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).optional(),
  module: z
    .enum(["SYSTEM", "INVENTORY", "PROCUREMENT", "SALES", "ACCOUNTING", "HR", "REPORTS"])
    .optional(),
});

export const notificationIdSchema = z.object({
  id: z.string().uuid(),
});
