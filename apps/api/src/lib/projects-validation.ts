import { z } from "zod";
import {
  apiDateNullableSchema,
  compareApiDateStrings,
  isValidApiDateString,
} from "./api-date.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const projectsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
});

export const projectIdSchema = z.object({
  id: z.string().uuid("Invalid project id"),
});

export const createProjectSchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(1),
  customerId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  startDate: z.string().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  budget: z.coerce.number().min(0).optional(),
  notes: z.string().trim().optional().nullable(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    customerId: z.string().uuid().nullable().optional(),
    managerId: z.string().uuid().nullable().optional(),
    startDate: apiDateNullableSchema.optional(),
    targetDate: apiDateNullableSchema.optional(),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    budget: z.coerce.number().min(0).optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.customerId !== undefined ||
      data.managerId !== undefined ||
      data.startDate !== undefined ||
      data.targetDate !== undefined ||
      data.status !== undefined ||
      data.progress !== undefined ||
      data.budget !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  )
  .superRefine((data, ctx) => {
    if (
      data.startDate &&
      data.targetDate &&
      compareApiDateStrings(data.startDate, data.targetDate) > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be on or before targetDate",
        path: ["targetDate"],
      });
    }
  });

export const tasksListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  projectId: z.string().uuid().optional(),
});

export const taskIdSchema = z.object({
  id: z.string().uuid("Invalid task id"),
});

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  description: z.string().trim().optional().nullable(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    dueDate: apiDateNullableSchema.optional(),
    status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
    description: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.assigneeId !== undefined ||
      data.priority !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.description !== undefined,
    { message: "At least one field is required" }
  );

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
});

export const milestonesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "COMPLETED", "MISSED"]).optional(),
  projectId: z.string().uuid().optional(),
});

export const milestoneIdSchema = z.object({
  id: z.string().uuid("Invalid milestone id"),
});

export const createMilestoneSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "COMPLETED", "MISSED"]).optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial().omit({ projectId: true });

/** Validate optional create-time date strings without rejecting legacy payloads. */
export function isOptionalApiDate(value: string | null | undefined): boolean {
  if (value == null || value === "") return true;
  return isValidApiDateString(value);
}
