import { z } from "zod";
import { apiDateNullableSchema, apiDateSchema, compareApiDateStrings } from "./api-date.js";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const employeesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]).optional(),
  location: z.string().trim().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z
    .enum(["NEWEST", "OLDEST", "NAME_ASC", "NAME_DESC", "HIRE_DESC", "HIRE_ASC"])
    .default("NAME_ASC"),
});

export const employeeIdSchema = z.object({
  id: z.string().uuid("Invalid employee id"),
});

export const departmentsListSchema = z.object({
  search: z.string().trim().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z
    .enum(["NEWEST", "OLDEST", "NAME_ASC", "NAME_DESC", "CODE_ASC", "CODE_DESC"])
    .default("NEWEST"),
});

export const attendanceListSchema = paginationSchema.extend({
  date: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "REMOTE", "HALF_DAY"]).optional(),
});

export const leaveRequestsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  type: z.enum(["ANNUAL", "SICK", "UNPAID", "EMERGENCY"]).optional(),
  sort: z.enum(["NEWEST", "OLDEST", "START_DESC", "START_ASC"]).default("NEWEST"),
});

export const leaveRequestIdSchema = z.object({
  id: z.string().uuid("Invalid leave request id"),
});

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email(),
  phone: z.string().trim().optional(),
  departmentId: z.string().uuid(),
  positionId: z.string().uuid(),
  managerId: z.string().uuid().optional(),
  hireDate: z.string(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]).default("ACTIVE"),
  workLocation: z.string().trim().min(1),
  salary: z.number().min(0).optional(),
});

export const updateEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    departmentId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
    managerId: z.string().uuid().nullable().optional(),
    hireDate: apiDateSchema.optional(),
    employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]).optional(),
    workLocation: z.string().trim().min(1).max(120).optional(),
    salary: z.number().min(0).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().uuid(),
    type: z.enum(["ANNUAL", "SICK", "UNPAID", "EMERGENCY"]),
    startDate: apiDateSchema,
    endDate: apiDateSchema,
    days: z.coerce.number().min(0.5),
    reason: z.string().trim().optional(),
    assignedApproverId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (compareApiDateStrings(data.startDate, data.endDate) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be on or before endDate",
        path: ["endDate"],
      });
    }
  });

export const createDepartmentSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateLeaveRequestSchema = z
  .object({
    type: z.enum(["ANNUAL", "SICK", "UNPAID", "EMERGENCY"]).optional(),
    startDate: apiDateSchema.optional(),
    endDate: apiDateSchema.optional(),
    days: z.coerce.number().min(0.5).optional(),
    reason: z.string().trim().nullable().optional(),
    assignedApproverId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.type !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.days !== undefined ||
      data.reason !== undefined ||
      data.assignedApproverId !== undefined,
    { message: "At least one field is required" }
  )
  .superRefine((data, ctx) => {
    if (
      data.startDate &&
      data.endDate &&
      compareApiDateStrings(data.startDate, data.endDate) > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be on or before endDate",
        path: ["endDate"],
      });
    }
  });

export const updateLeaveStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const payrollListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "PROCESSED", "PARTIALLY_PAID", "PAID", "CANCELLED"]).optional(),
  sort: z.enum(["NEWEST", "OLDEST", "PERIOD_DESC", "PERIOD_ASC"]).default("NEWEST"),
});

export const payrollIdSchema = z.object({
  id: z.string().uuid("Invalid payroll run id"),
});

export const payrollLinePayParamsSchema = z.object({
  id: z.string().uuid("Invalid payroll run id"),
  lineId: z.string().uuid("Invalid payroll line id"),
});

export const payrollEligibleLineIdsSchema = z.object({
  departmentId: z.string().uuid().optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "all"]).optional(),
});

export const createPayrollRunSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  notes: z.string().trim().optional(),
});

export const updatePayrollRunSchema = z
  .object({
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => data.notes !== undefined, { message: "At least one field is required" });

export const payPayrollRunSchema = z
  .object({
    mode: z.enum(["allRemaining", "department", "employees", "lines"]),
    departmentId: z.string().uuid().optional(),
    employeeIds: z.array(z.string().uuid()).max(500).optional(),
    lineIds: z.array(z.string().uuid()).max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "department" && !data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "departmentId is required for department payments",
        path: ["departmentId"],
      });
    }
    if (data.mode === "employees" && (!data.employeeIds || data.employeeIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "employeeIds are required for selected employee payments",
        path: ["employeeIds"],
      });
    }
    if (data.mode === "lines" && (!data.lineIds || data.lineIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lineIds are required for selected line payments",
        path: ["lineIds"],
      });
    }
  });

export const contractsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "TERMINATED", "DRAFT"]).optional(),
  contractType: z.enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP", "CONSULTANT"]).optional(),
  sort: z
    .enum(["NEWEST", "OLDEST", "START_DESC", "START_ASC", "END_ASC", "END_DESC"])
    .default("NEWEST"),
});

export const contractIdSchema = z.object({
  id: z.string().uuid("Invalid contract id"),
});

export const createContractSchema = z
  .object({
    employeeId: z.string().uuid(),
    contractNumber: z.string().trim().min(1).max(64),
    contractType: z.enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP", "CONSULTANT"]),
    startDate: apiDateSchema,
    endDate: apiDateSchema.optional(),
    salary: z.coerce.number().min(0),
    status: z.enum(["ACTIVE", "EXPIRED", "TERMINATED", "DRAFT"]).default("ACTIVE"),
    notes: z.string().trim().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && compareApiDateStrings(data.startDate, data.endDate) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be on or before endDate",
        path: ["endDate"],
      });
    }
  });

export const updateContractSchema = z
  .object({
    contractType: z
      .enum(["FULL_TIME", "PART_TIME", "TEMPORARY", "INTERNSHIP", "CONSULTANT"])
      .optional(),
    startDate: apiDateSchema.optional(),
    endDate: apiDateNullableSchema.optional(),
    salary: z.coerce.number().min(0).optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "TERMINATED", "DRAFT"]).optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.contractType !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.salary !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  );

export const documentsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["VALID", "EXPIRED", "MISSING", "PENDING_REVIEW"]).optional(),
  documentType: z.string().trim().optional(),
  expiryState: z.enum(["expired", "expiring_soon", "ok"]).optional(),
  sort: z
    .enum(["NEWEST", "OLDEST", "EXPIRY_ASC", "EXPIRY_DESC", "TITLE_ASC", "TITLE_DESC"])
    .default("NEWEST"),
});

export const documentIdSchema = z.object({
  id: z.string().uuid("Invalid document id"),
});

export const createDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  documentType: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  fileUrl: z.string().trim().max(2000).optional(),
  expiryDate: apiDateSchema.optional(),
  status: z.enum(["VALID", "EXPIRED", "MISSING", "PENDING_REVIEW"]).default("VALID"),
  notes: z.string().trim().max(5000).optional(),
});

export const updateHrDocumentSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    documentType: z.string().trim().min(1).optional(),
    fileUrl: z.string().trim().nullable().optional(),
    expiryDate: apiDateNullableSchema.optional(),
    status: z.enum(["VALID", "EXPIRED", "MISSING", "PENDING_REVIEW"]).optional(),
    notes: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.documentType !== undefined ||
      data.fileUrl !== undefined ||
      data.expiryDate !== undefined ||
      data.status !== undefined ||
      data.notes !== undefined,
    { message: "At least one field is required" }
  );

export const positionsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z
    .enum(["NEWEST", "OLDEST", "TITLE_ASC", "TITLE_DESC", "DEPT_TITLE"])
    .default("NEWEST"),
});

export const positionIdSchema = z.object({
  id: z.string().uuid("Invalid position id"),
});

export const createPositionSchema = z.object({
  departmentId: z.string().uuid(),
  title: z.string().trim().min(1),
  level: z.string().trim().min(1),
  isActive: z.boolean().default(true),
});

export const updatePositionSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    level: z.string().trim().min(1).optional(),
    departmentId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.level !== undefined ||
      data.departmentId !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field is required" }
  );
