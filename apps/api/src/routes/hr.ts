import { Router } from "express";
import type { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { HR_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  AVATAR_MAX_BYTES,
  decodeBase64Image,
  deleteEmployeeAvatar,
  extensionForMime,
  mimeForExtension,
  resolveStoragePath,
  writeEmployeeAvatar,
} from "../lib/avatar-storage.js";
import { uploadAvatarSchema } from "../lib/auth-profile-validation.js";
import {
  changedFields,
  getMasterDataLifecycle,
  logMasterDataEvent,
} from "../lib/master-data-audit.js";
import { setLifecycleSchema } from "../lib/master-data-validation.js";
import {
  attendanceListSchema,
  contractsListSchema,
  contractIdSchema,
  createContractSchema,
  createDepartmentSchema,
  createDocumentSchema,
  createEmployeeSchema,
  createLeaveRequestSchema,
  createPayrollRunSchema,
  createPositionSchema,
  departmentsListSchema,
  documentsListSchema,
  documentIdSchema,
  employeeIdSchema,
  employeesListSchema,
  leaveRequestIdSchema,
  leaveRequestsListSchema,
  payrollIdSchema,
  payrollEligibleLineIdsSchema,
  payrollLinePayParamsSchema,
  payrollListSchema,
  payPayrollRunSchema,
  positionIdSchema,
  positionsListSchema,
  updateContractSchema,
  updateEmployeeSchema,
  updateHrDocumentSchema,
  updateLeaveRequestSchema,
  updateLeaveStatusSchema,
  updatePayrollRunSchema,
  updatePositionSchema,
} from "../lib/hr-validation.js";
import {
  contractListOrderBy,
  departmentListOrderBy,
  documentListOrderBy,
  employeeListOrderBy,
  leaveListOrderBy,
  payrollListOrderBy,
  positionListOrderBy,
} from "../lib/hr-list-order.js";
import { compareApiDateStrings, toApiDateUtcNoon } from "../lib/api-date.js";
import {
  formatMoney,
  fullName,
  serializeAttendance,
  serializeContract,
  serializeContractDetail,
  serializeDepartment,
  serializeDocument,
  serializeDocumentDetail,
  serializeEmployee,
  serializeEmployeeDetail,
  serializeLeaveRequest,
  serializeLeaveRequestDetail,
  serializePayrollRun,
  serializePayrollRunDetail,
  serializePosition,
  serializePositionDetail,
} from "../lib/serialize-hr.js";
import {
  executePayrollLinePayment,
  executePayrollPayment,
  PayrollPaymentError,
  payrollDetailInclude,
} from "../lib/payroll-payment.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const employeeInclude = {
  department: true,
  position: true,
  manager: true,
  user: { select: { id: true, lastSeenAt: true, lastActiveAt: true, avatarPath: true, updatedAt: true } },
} as const;

const leaveInclude = {
  employee: { include: { department: true, position: true } },
  approvedBy: true,
  assignedApprover: true,
  decidedBy: true,
} as const;

async function resolveActiveAssignedApprover(orgId: string, assignedApproverId: string | null | undefined) {
  if (assignedApproverId === undefined) return { ok: true as const, id: undefined };
  if (assignedApproverId === null) return { ok: true as const, id: null };
  const approver = await prisma.employee.findFirst({
    where: { id: assignedApproverId, organizationId: orgId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!approver) {
    return { ok: false as const, error: "Assigned approver not found or inactive" };
  }
  return { ok: true as const, id: approver.id, approver };
}

const attendanceInclude = {
  employee: { include: { department: true } },
} as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function loadEmployeeDetail(
  orgId: string,
  employeeId: string,
  options?: { includeSalary?: boolean }
) {
  const includeSalary = options?.includeSalary === true;
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: orgId },
    include: employeeInclude,
  });
  if (!employee) return null;

  const [attendance, leaves, lifecycle, directReports, activeContract, recentDocuments, latestPayrollLine] =
    await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { organizationId: orgId, employeeId: employee.id },
        include: attendanceInclude,
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.leaveRequest.findMany({
        where: { organizationId: orgId, employeeId: employee.id },
        include: leaveInclude,
        orderBy: { startDate: "desc" },
        take: 8,
      }),
      getMasterDataLifecycle(prisma, {
        organizationId: orgId,
        entity: "Employee",
        entityId: employee.id,
        metadata: {
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
          deactivatedAt: employee.deactivatedAt,
          reactivatedAt: employee.reactivatedAt,
        },
      }),
      prisma.employee.findMany({
        where: { organizationId: orgId, managerId: employee.id, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          position: { select: { title: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 12,
      }),
      prisma.employeeContract.findFirst({
        where: { organizationId: orgId, employeeId: employee.id, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      }),
      prisma.employeeDocument.findMany({
        where: { organizationId: orgId, employeeId: employee.id },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      includeSalary
        ? prisma.payrollLine.findFirst({
            where: { organizationId: orgId, employeeId: employee.id },
            include: {
              payrollRun: {
                select: {
                  id: true,
                  runNumber: true,
                  periodStart: true,
                  periodEnd: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve(null),
    ]);

  return {
    ...serializeEmployeeDetail(employee, attendance, leaves, {
      includeSalary,
      directReports,
      activeContract,
      recentDocuments,
      latestPayrollLine,
    }),
    ...lifecycle,
  };
}

async function employeeDeactivationBlocks(orgId: string, employeeId: string) {
  const [activeReports, pendingLeaves, activeContracts, openPayrollLines] = await Promise.all([
    prisma.employee.count({
      where: { organizationId: orgId, managerId: employeeId, isActive: true },
    }),
    prisma.leaveRequest.count({
      where: {
        organizationId: orgId,
        status: "PENDING",
        OR: [{ employeeId }, { assignedApproverId: employeeId }],
      },
    }),
    prisma.employeeContract.count({
      where: { organizationId: orgId, employeeId, status: "ACTIVE" },
    }),
    prisma.payrollLine.count({
      where: {
        organizationId: orgId,
        employeeId,
        status: { in: ["DRAFT", "PROCESSED"] },
      },
    }),
  ]);

  return {
    activeDirectReports: activeReports,
    pendingLeaveRequests: pendingLeaves,
    activeContracts,
    openPayrollLines,
  };
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(HR_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const today = startOfDay(new Date());
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const expiringLimit = new Date(today);
    expiringLimit.setDate(expiringLimit.getDate() + 60);

    const [
      totalEmployees,
      activeEmployees,
      departments,
      deptCounts,
      todayAttendance,
      pendingLeaveRequests,
      recentLeaves,
      onLeaveEmployeeIds,
      payrollThisMonthAgg,
      pendingPayrollRuns,
      activeContracts,
      expiringContracts,
      missingDocuments,
      expiredDocuments,
      newHireRows,
    ] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId } }),
      prisma.employee.count({
        where: { organizationId: orgId, isActive: true, employmentStatus: "ACTIVE" },
      }),
      prisma.department.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true, code: true },
      }),
      prisma.employee.groupBy({
        by: ["departmentId"],
        where: { organizationId: orgId, isActive: true },
        _count: { _all: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { organizationId: orgId, date: today },
        select: { status: true },
      }),
      prisma.leaveRequest.count({ where: { organizationId: orgId, status: "PENDING" } }),
      prisma.leaveRequest.findMany({
        where: { organizationId: orgId },
        include: leaveInclude,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.employee.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { employmentStatus: "ON_LEAVE" },
            {
              leaveRequests: {
                some: {
                  status: "APPROVED",
                  startDate: { lte: today },
                  endDate: { gte: today },
                },
              },
            },
          ],
        },
        select: { id: true },
      }),
      prisma.payrollRun.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ["PROCESSED", "PARTIALLY_PAID", "PAID"] },
          periodStart: { lte: monthEnd },
          periodEnd: { gte: monthStart },
        },
        _sum: { netTotal: true },
      }),
      prisma.payrollRun.count({ where: { organizationId: orgId, status: "DRAFT" } }),
      prisma.employeeContract.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.employeeContract.count({
        where: {
          organizationId: orgId,
          status: "ACTIVE",
          endDate: { gte: today, lte: expiringLimit },
        },
      }),
      prisma.employeeDocument.count({
        where: { organizationId: orgId, status: "MISSING" },
      }),
      prisma.employeeDocument.count({
        where: {
          organizationId: orgId,
          OR: [
            { status: "EXPIRED" },
            { AND: [{ expiryDate: { lt: today } }, { status: { not: "MISSING" } }] },
          ],
        },
      }),
      prisma.employee.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
          hireDate: { gte: ninetyDaysAgo },
        },
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          hireDate: true,
          department: { select: { name: true } },
        },
        orderBy: { hireDate: "desc" },
        take: 8,
      }),
    ]);

    const deptCountMap = new Map(deptCounts.map((row) => [row.departmentId, row._count._all]));

    const attendanceSummaryMap = new Map<string, number>();
    for (const record of todayAttendance) {
      attendanceSummaryMap.set(record.status, (attendanceSummaryMap.get(record.status) ?? 0) + 1);
    }

    const newHires = newHireRows.map((e) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      fullName: fullName(e.firstName, e.lastName),
      department: e.department.name,
      hireDate: e.hireDate.toISOString().slice(0, 10),
    }));

    res.json({
      totalEmployees,
      activeEmployees,
      onLeaveToday: onLeaveEmployeeIds.length,
      attendanceToday: todayAttendance.filter((a) =>
        ["PRESENT", "LATE", "REMOTE", "HALF_DAY"].includes(a.status)
      ).length,
      pendingLeaveRequests,
      departmentsCount: departments.length,
      payrollThisMonth: formatMoney(Number(payrollThisMonthAgg._sum.netTotal ?? 0)),
      pendingPayrollRuns,
      activeContracts,
      expiringContracts,
      missingDocuments,
      expiredDocuments,
      employeesByDepartment: departments.map((dept) => ({
        department: dept.name,
        code: dept.code,
        count: deptCountMap.get(dept.id) ?? 0,
      })),
      attendanceSummary: Array.from(attendanceSummaryMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      recentLeaveRequests: recentLeaves.map(serializeLeaveRequest),
      newHires,
    });
  })
);

router.get(
  "/employees",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = employeesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, departmentId, status, location, active, sort } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(departmentId ? { departmentId } : {}),
      ...(status ? { employmentStatus: status } : {}),
      ...(location ? { workLocation: { contains: location, mode: "insensitive" as const } } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { employeeNumber: { contains: search, mode: "insensitive" as const } },
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: employeeListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    res.json({
      data: employees.map((emp) =>
        serializeEmployee(emp, {
          includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
        })
      ),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/employees/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = employeeIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const detail = await loadEmployeeDetail(orgId, parsed.data.id, {
      includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
    });
    if (!detail) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    res.json(detail);
  })
);

router.patch(
  "/employees/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = employeeIdSchema.safeParse(req.params);
    const bodyParsed = updateEmployeeSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.employee.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const body = bodyParsed.data;

    if (body.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: body.departmentId, organizationId: orgId },
      });
      if (!dept) {
        res.status(400).json({ error: "Department not found in this organization" });
        return;
      }
    }
    if (body.positionId) {
      const pos = await prisma.position.findFirst({
        where: { id: body.positionId, organizationId: orgId },
      });
      if (!pos) {
        res.status(400).json({ error: "Position not found in this organization" });
        return;
      }
    }
    if (body.managerId) {
      if (body.managerId === existing.id) {
        res.status(400).json({ error: "Employee cannot report to themselves" });
        return;
      }
      const manager = await prisma.employee.findFirst({
        where: { id: body.managerId, organizationId: orgId },
      });
      if (!manager) {
        res.status(400).json({ error: "Manager not found in this organization" });
        return;
      }
    }
    if (body.email && body.email !== existing.email) {
      const clash = await prisma.employee.findFirst({
        where: {
          organizationId: orgId,
          email: body.email,
          NOT: { id: existing.id },
        },
      });
      if (clash) {
        res.status(400).json({ error: "Another employee already uses this email" });
        return;
      }
    }

    const { profile, notesChanged } = changedFields(body);

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: existing.id },
        data: {
          ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
          ...(body.positionId !== undefined ? { positionId: body.positionId } : {}),
          ...(body.managerId !== undefined ? { managerId: body.managerId } : {}),
          ...(body.hireDate !== undefined ? { hireDate: toApiDateUtcNoon(body.hireDate) } : {}),
          ...(body.employmentStatus !== undefined
            ? { employmentStatus: body.employmentStatus }
            : {}),
          ...(body.workLocation !== undefined ? { workLocation: body.workLocation } : {}),
          ...(body.salary !== undefined ? { salary: body.salary } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Employee",
          entityId: existing.id,
          action: "details_updated",
          summary: "Employee details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Employee",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Employee notes updated",
          fields: ["notes"],
        });
      }
    });

    const detail = await loadEmployeeDetail(orgId, existing.id, {
      includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
    });
    res.json(detail);
  })
);

router.patch(
  "/employees/:id/lifecycle",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = employeeIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.employee.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const { active } = bodyParsed.data;
    if (existing.isActive === active) {
      const detail = await loadEmployeeDetail(orgId, existing.id, {
        includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
      });
      res.json(detail);
      return;
    }

    if (!active) {
      const details = await employeeDeactivationBlocks(orgId, existing.id);
      const blocked =
        details.activeDirectReports > 0 ||
        details.pendingLeaveRequests > 0 ||
        details.activeContracts > 0 ||
        details.openPayrollLines > 0;

      if (blocked) {
        res.status(409).json({
          error: "Employee cannot be deactivated while active dependencies remain",
          code: "EMPLOYEE_HAS_ACTIVE_DEPENDENCIES",
          details,
        });
        return;
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: existing.id },
        data: active
          ? { isActive: true, reactivatedAt: now }
          : { isActive: false, deactivatedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Employee",
        entityId: existing.id,
        action: active ? "reactivated" : "deactivated",
        summary: active ? "Employee reactivated" : "Employee deactivated",
        description: active
          ? "Employee reactivated; employment status was left unchanged"
          : "Employee deactivated; employment status was left unchanged",
      });
    });

    const detail = await loadEmployeeDetail(orgId, existing.id, {
      includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
    });
    res.json(detail);
  })
);

router.get(
  "/employees/:id/avatar",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = employeeIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      select: { id: true, avatarPath: true, updatedAt: true },
    });

    if (!employee?.avatarPath) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    try {
      const absolute = resolveStoragePath(employee.avatarPath);
      const buffer = await fs.readFile(absolute);
      const ext = path.extname(employee.avatarPath);
      res.setHeader("Content-Type", mimeForExtension(ext));
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Last-Modified", employee.updatedAt.toUTCString());
      res.send(buffer);
    } catch {
      res.status(404).json({ error: "Avatar not found" });
    }
  })
);

router.post(
  "/employees/:id/avatar",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = employeeIdSchema.safeParse(req.params);
    const bodyParsed = uploadAvatarSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid avatar upload", details: bodyParsed.error?.flatten() });
      return;
    }

    if (!extensionForMime(bodyParsed.data.mimeType)) {
      res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = decodeBase64Image(bodyParsed.data.data);
    } catch {
      res.status(400).json({ error: "Invalid image data" });
      return;
    }

    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      res.status(400).json({ error: "Image must be 2 MB or smaller" });
      return;
    }

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng =
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (
      (bodyParsed.data.mimeType === "image/jpeg" && !isJpeg) ||
      (bodyParsed.data.mimeType === "image/png" && !isPng) ||
      (bodyParsed.data.mimeType === "image/webp" && !isWebp)
    ) {
      res.status(400).json({ error: "Image content does not match the declared type" });
      return;
    }

    const existing = await prisma.employee.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    let relativePath: string;
    try {
      relativePath = await writeEmployeeAvatar({
        organizationId: orgId,
        employeeId: existing.id,
        mimeType: bodyParsed.data.mimeType,
        buffer,
        previousPath: existing.avatarPath,
      });
    } catch {
      res.status(400).json({ error: "Unable to save avatar" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: existing.id },
        data: { avatarPath: relativePath },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Employee",
        entityId: existing.id,
        action: "details_updated",
        summary: "Employee photo updated",
        fields: ["avatar"],
      });
    });

    const detail = await loadEmployeeDetail(orgId, existing.id, {
      includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
    });
    res.json(detail);
  })
);

router.delete(
  "/employees/:id/avatar",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = employeeIdSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      res.status(400).json({ error: "Invalid employee id" });
      return;
    }

    const existing = await prisma.employee.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    await deleteEmployeeAvatar(existing.avatarPath);

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: existing.id },
        data: { avatarPath: null },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Employee",
        entityId: existing.id,
        action: "details_updated",
        summary: "Employee photo removed",
        fields: ["avatar"],
      });
    });

    const detail = await loadEmployeeDetail(orgId, existing.id, {
      includeSalary: Boolean(req.authz?.permissions.includes(HR_PERMISSIONS.WRITE)),
    });
    res.json(detail);
  })
);

router.get(
  "/departments",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = departmentsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { search, active, sort } = parsed.data;
    const where = {
      organizationId: orgId,
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const departments = await prisma.department.findMany({
      where,
      orderBy: departmentListOrderBy(sort),
    });

    const [employeeCounts, positionCounts] = await Promise.all([
      prisma.employee.groupBy({
        by: ["departmentId"],
        where: { organizationId: orgId, isActive: true },
        _count: { departmentId: true },
      }),
      prisma.position.groupBy({
        by: ["departmentId"],
        where: { organizationId: orgId, isActive: true },
        _count: { departmentId: true },
      }),
    ]);

    const empCountMap = new Map(employeeCounts.map((c) => [c.departmentId, c._count.departmentId]));
    const posCountMap = new Map(positionCounts.map((c) => [c.departmentId, c._count.departmentId]));

    res.json({
      data: departments.map((d) =>
        serializeDepartment(d, {
          employees: empCountMap.get(d.id) ?? 0,
          positions: posCountMap.get(d.id) ?? 0,
        })
      ),
    });
  })
);

router.post(
  "/departments",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const code = parsed.data.code.toUpperCase();
    const name = parsed.data.name.trim();

    const [existingCode, existingName] = await Promise.all([
      prisma.department.findFirst({
        where: { organizationId: orgId, code },
        select: { id: true },
      }),
      prisma.department.findFirst({
        where: { organizationId: orgId, name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      }),
    ]);

    if (existingCode) {
      res.status(409).json({ error: "A department with this code already exists" });
      return;
    }
    if (existingName) {
      res.status(409).json({ error: "A department with this name already exists" });
      return;
    }

    const department = await prisma.department.create({
      data: {
        organizationId: orgId,
        code,
        name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive ?? true,
      },
    });

    res.status(201).json(
      serializeDepartment(department, {
        employees: 0,
        positions: 0,
      })
    );
  })
);

router.get(
  "/attendance",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = attendanceListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, date, departmentId, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(date ? { date: new Date(date) } : {}),
      ...(status ? { status } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        include: attendanceInclude,
        orderBy: [{ date: "desc" }, { employee: { lastName: "asc" } }],
        skip,
        take: limit,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    res.json({
      data: records.map(serializeAttendance),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/leave-requests",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = leaveRequestsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, type, sort } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { employee: { firstName: { contains: search, mode: "insensitive" as const } } },
              { employee: { lastName: { contains: search, mode: "insensitive" as const } } },
              { employee: { employeeNumber: { contains: search, mode: "insensitive" as const } } },
              { reason: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: leaveInclude,
        orderBy: leaveListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    res.json({
      data: requests.map(serializeLeaveRequest),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/leave-requests/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = leaveRequestIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: leaveInclude,
    });
    if (!leave) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }

    res.json(serializeLeaveRequestDetail(leave));
  })
);

router.post(
  "/employees",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const employee = await prisma.employee.create({
      data: {
        organizationId: orgId,
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? null,
        departmentId: data.departmentId,
        positionId: data.positionId,
        managerId: data.managerId ?? null,
        hireDate: new Date(data.hireDate),
        employmentStatus: data.employmentStatus,
        workLocation: data.workLocation,
        salary: data.salary ?? null,
      },
      include: employeeInclude,
    });

    res.status(201).json(serializeEmployee(employee));
  })
);

router.post(
  "/leave-requests",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createLeaveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId: orgId, isActive: true },
      select: { id: true, managerId: true },
    });
    if (!employee) {
      res.status(400).json({ error: "Employee not found or inactive" });
      return;
    }

    const assigned = await resolveActiveAssignedApprover(orgId, data.assignedApproverId);
    if (!assigned.ok) {
      res.status(400).json({ error: assigned.error });
      return;
    }

    let assignedApproverId: string | null;
    if (data.assignedApproverId !== undefined) {
      assignedApproverId = assigned.id ?? null;
    } else if (employee.managerId) {
      const derived = await resolveActiveAssignedApprover(orgId, employee.managerId);
      assignedApproverId = derived.ok ? (derived.id ?? null) : null;
    } else {
      assignedApproverId = null;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        type: data.type,
        startDate: toApiDateUtcNoon(data.startDate),
        endDate: toApiDateUtcNoon(data.endDate),
        days: data.days,
        reason: data.reason ?? null,
        assignedApproverId,
        status: "PENDING",
      },
      include: leaveInclude,
    });

    if (assignedApproverId) {
      await logMasterDataEvent(prisma, {
        organizationId: orgId,
        userId: req.user!.userId,
        entity: "LeaveRequest",
        entityId: leave.id,
        action: "approver_assigned",
        summary: "Assigned leave approver",
        fields: ["assignedApproverId"],
      });
    }

    res.status(201).json(serializeLeaveRequest(leave));
  })
);

router.patch(
  "/leave-requests/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const idParsed = leaveRequestIdSchema.safeParse(req.params);
    const bodyParsed = updateLeaveRequestSchema.safeParse(req.body);

    if (!idParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: { id: idParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    if (existing.status !== "PENDING") {
      res.status(400).json({ error: "Only pending leave requests can be edited" });
      return;
    }

    const body = bodyParsed.data;
    const nextStart =
      body.startDate !== undefined
        ? body.startDate
        : existing.startDate.toISOString().slice(0, 10);
    const nextEnd =
      body.endDate !== undefined ? body.endDate : existing.endDate.toISOString().slice(0, 10);

    if (compareApiDateStrings(nextStart, nextEnd) > 0) {
      res.status(400).json({ error: "startDate must be on or before endDate" });
      return;
    }

    let nextAssignedApproverId: string | null | undefined = undefined;
    if (body.assignedApproverId !== undefined) {
      const assigned = await resolveActiveAssignedApprover(orgId, body.assignedApproverId);
      if (!assigned.ok) {
        res.status(400).json({ error: assigned.error });
        return;
      }
      nextAssignedApproverId = assigned.id ?? null;
    }

    const previousAssignedId = existing.assignedApproverId;

    const leave = await prisma.leaveRequest.update({
      where: { id: existing.id },
      data: {
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.startDate !== undefined ? { startDate: toApiDateUtcNoon(body.startDate) } : {}),
        ...(body.endDate !== undefined ? { endDate: toApiDateUtcNoon(body.endDate) } : {}),
        ...(body.days !== undefined ? { days: body.days } : {}),
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
        ...(nextAssignedApproverId !== undefined
          ? { assignedApproverId: nextAssignedApproverId }
          : {}),
      },
      include: leaveInclude,
    });

    if (
      nextAssignedApproverId !== undefined &&
      nextAssignedApproverId !== previousAssignedId
    ) {
      await logMasterDataEvent(prisma, {
        organizationId: orgId,
        userId: req.user!.userId,
        entity: "LeaveRequest",
        entityId: leave.id,
        action: "approver_assigned",
        summary: nextAssignedApproverId
          ? "Updated assigned leave approver"
          : "Cleared assigned leave approver",
        fields: ["assignedApproverId"],
      });
    }

    res.json(serializeLeaveRequestDetail(leave));
  })
);

router.patch(
  "/leave-requests/:id/status",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const idParsed = leaveRequestIdSchema.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ error: "Invalid leave request id" });
      return;
    }

    const bodyParsed = updateLeaveStatusSchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid request body", details: bodyParsed.error.flatten() });
      return;
    }

    const existing = await prisma.leaveRequest.findFirst({
      where: { id: idParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Leave request not found" });
      return;
    }
    if (existing.status !== "PENDING") {
      res.status(400).json({ error: "Only pending leave requests can be updated" });
      return;
    }

    const decidedAt = new Date();
    const leave = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: existing.id },
        data: {
          status: bodyParsed.data.status,
          decidedById: req.user!.userId,
          decidedAt,
          // Do not overwrite legacy/historical approvedById via client — leave assignedApprover intact.
        },
        include: leaveInclude,
      });

      if (bodyParsed.data.status === "APPROVED") {
        await tx.employee.update({
          where: { id: updated.employeeId },
          data: { employmentStatus: "ON_LEAVE" },
        });
      }

      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId: req.user!.userId,
        entity: "LeaveRequest",
        entityId: updated.id,
        action: bodyParsed.data.status === "APPROVED" ? "approved" : "rejected",
        summary:
          bodyParsed.data.status === "APPROVED"
            ? "Leave request approved"
            : "Leave request rejected",
        fields: ["status", "decidedById", "decidedAt"],
      });

      return updated;
    });

    res.json(serializeLeaveRequestDetail(leave));
  })
);

router.get(
  "/payroll",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = payrollListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, sort } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(search
        ? { runNumber: { contains: search, mode: "insensitive" as const } }
        : {}),
    };

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        include: { processedBy: true, _count: { select: { lines: true } } },
        orderBy: payrollListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.payrollRun.count({ where }),
    ]);

    res.json({
      data: runs.map(serializePayrollRun),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/payroll/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = payrollIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payroll run id" });
      return;
    }

    const run = await prisma.payrollRun.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: payrollDetailInclude,
    });

    if (!run) {
      res.status(404).json({ error: "Payroll run not found" });
      return;
    }

    res.json(serializePayrollRunDetail(run));
  })
);

router.post(
  "/payroll",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createPayrollRunSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const activeEmployees = await prisma.employee.findMany({
      where: { organizationId: orgId, isActive: true, salary: { not: null } },
    });

    if (activeEmployees.length === 0) {
      res.status(400).json({ error: "No active employees with salary configured" });
      return;
    }

    const count = await prisma.payrollRun.count({ where: { organizationId: orgId } });
    const runNumber = `PR-2026-${String(count + 1).padStart(4, "0")}`;

    let grossTotal = 0;
    let deductionsTotal = 0;
    let netTotal = 0;

    const linesData = activeEmployees.map((emp) => {
      const base = Number(emp.salary ?? 0);
      const allowances = Math.round(base * 0.08 * 100) / 100;
      const deductions = Math.round(base * 0.075 * 100) / 100;
      const net = base + allowances - deductions;
      grossTotal += base + allowances;
      deductionsTotal += deductions;
      netTotal += net;
      return {
        organizationId: orgId,
        employeeId: emp.id,
        baseSalary: base,
        allowances,
        deductions,
        netPay: net,
        status: "DRAFT" as const,
      };
    });

    const run = await prisma.payrollRun.create({
      data: {
        organizationId: orgId,
        runNumber,
        periodStart: new Date(parsed.data.periodStart),
        periodEnd: new Date(parsed.data.periodEnd),
        status: "DRAFT",
        grossTotal,
        deductionsTotal,
        netTotal,
        notes: parsed.data.notes ?? null,
        lines: { create: linesData },
      },
      include: payrollDetailInclude,
    });

    res.status(201).json(serializePayrollRunDetail(run));
  })
);

router.patch(
  "/payroll/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = payrollIdSchema.safeParse(req.params);
    const bodyParsed = updatePayrollRunSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.payrollRun.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Payroll run not found" });
      return;
    }
    if (existing.status !== "DRAFT") {
      res.status(400).json({ error: "Only draft payroll runs can be edited" });
      return;
    }

    const run = await prisma.payrollRun.update({
      where: { id: existing.id },
      data: { notes: bodyParsed.data.notes },
      include: payrollDetailInclude,
    });

    res.json(serializePayrollRunDetail(run));
  })
);

router.patch(
  "/payroll/:id/process",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = payrollIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payroll run id" });
      return;
    }

    const existing = await prisma.payrollRun.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: { lines: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Payroll run not found" });
      return;
    }
    if (existing.status !== "DRAFT") {
      res.status(400).json({ error: "Only draft payroll runs can be processed" });
      return;
    }

    const grossTotal = existing.lines.reduce((s, l) => s + Number(l.baseSalary) + Number(l.allowances), 0);
    const deductionsTotal = existing.lines.reduce((s, l) => s + Number(l.deductions), 0);
    const netTotal = existing.lines.reduce((s, l) => s + Number(l.netPay), 0);

    const run = await prisma.$transaction(async (tx) => {
      await tx.payrollLine.updateMany({
        where: { payrollRunId: existing.id },
        data: { status: "PROCESSED" },
      });
      return tx.payrollRun.update({
        where: { id: existing.id },
        data: {
          status: "PROCESSED",
          grossTotal,
          deductionsTotal,
          netTotal,
          processedById: req.user!.userId,
          processedAt: new Date(),
        },
        include: payrollDetailInclude,
      });
    });

    res.json(serializePayrollRunDetail(run));
  })
);

router.get(
  "/payroll/:id/eligible-line-ids",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const idParsed = payrollIdSchema.safeParse(req.params);
    const queryParsed = payrollEligibleLineIdsSchema.safeParse(req.query);
    if (!idParsed.success || !queryParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const run = await prisma.payrollRun.findFirst({
      where: { id: idParsed.data.id, organizationId: orgId },
      select: { id: true, status: true },
    });
    if (!run) {
      res.status(404).json({ error: "Payroll run not found" });
      return;
    }
    if (run.status !== "PROCESSED" && run.status !== "PARTIALLY_PAID") {
      res.status(400).json({ error: "Payroll must be processed before payment" });
      return;
    }

    const { departmentId, paymentStatus } = queryParsed.data;
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, organizationId: orgId },
        select: { id: true },
      });
      if (!dept) {
        res.status(400).json({ error: "Invalid department" });
        return;
      }
    }

    // Eligible for selection/pay = unpaid PROCESSED lines (never already-paid).
    const wantsPaidOnly = paymentStatus === "PAID";
    if (wantsPaidOnly) {
      res.json({ lineIds: [] as string[] });
      return;
    }

    const lines = await prisma.payrollLine.findMany({
      where: {
        payrollRunId: run.id,
        organizationId: orgId,
        status: "PROCESSED",
        ...(departmentId ? { employee: { departmentId } } : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    res.json({ lineIds: lines.map((l) => l.id) });
  })
);

router.post(
  "/payroll/:id/pay",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const idParsed = payrollIdSchema.safeParse(req.params);
    const bodyParsed = payPayrollRunSchema.safeParse(req.body);
    if (!idParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    try {
      const run = await executePayrollPayment({
        orgId,
        userId: req.user!.userId,
        runId: idParsed.data.id,
        mode: bodyParsed.data.mode,
        departmentId: bodyParsed.data.departmentId,
        employeeIds: bodyParsed.data.employeeIds,
        lineIds: bodyParsed.data.lineIds,
      });
      res.json(serializePayrollRunDetail(run));
    } catch (err) {
      if (err instanceof PayrollPaymentError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2028"
      ) {
        res.status(409).json({
          error: "Payment could not be completed. Please refresh and try again.",
        });
        return;
      }
      throw err;
    }
  })
);

router.post(
  "/payroll/:id/lines/:lineId/pay",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = payrollLinePayParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payroll line id" });
      return;
    }

    try {
      const run = await executePayrollLinePayment({
        orgId,
        userId: req.user!.userId,
        runId: parsed.data.id,
        lineId: parsed.data.lineId,
      });
      res.json(serializePayrollRunDetail(run));
    } catch (err) {
      if (err instanceof PayrollPaymentError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2028"
      ) {
        res.status(409).json({
          error: "Payment could not be completed. Please refresh and try again.",
        });
        return;
      }
      throw err;
    }
  })
);

router.get(
  "/contracts",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = contractsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, contractType, sort } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(contractType ? { contractType } : {}),
      ...(search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: "insensitive" as const } },
              { employee: { firstName: { contains: search, mode: "insensitive" as const } } },
              { employee: { lastName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [contracts, total] = await Promise.all([
      prisma.employeeContract.findMany({
        where,
        include: { employee: { include: { department: true, position: true } } },
        orderBy: contractListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.employeeContract.count({ where }),
    ]);

    res.json({
      data: contracts.map(serializeContract),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/contracts/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = contractIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid contract id" });
      return;
    }

    const contract = await prisma.employeeContract.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: { employee: { include: { department: true, position: true } } },
    });

    if (!contract) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    res.json(serializeContractDetail(contract));
  })
);

router.post(
  "/contracts",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createContractSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId: orgId, isActive: true },
    });
    if (!employee) {
      res.status(400).json({ error: "Employee not found or inactive" });
      return;
    }

    const existingNumber = await prisma.employeeContract.findFirst({
      where: { organizationId: orgId, contractNumber: data.contractNumber },
      select: { id: true },
    });
    if (existingNumber) {
      res.status(409).json({ error: "A contract with this number already exists" });
      return;
    }

    if (data.status === "ACTIVE") {
      const conflicting = await prisma.employeeContract.findFirst({
        where: {
          organizationId: orgId,
          employeeId: data.employeeId,
          status: "ACTIVE",
        },
        select: { id: true, contractNumber: true },
      });
      if (conflicting) {
        res.status(409).json({
          error: `Employee already has an active contract (${conflicting.contractNumber})`,
        });
        return;
      }
    }

    const contract = await prisma.employeeContract.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        contractNumber: data.contractNumber,
        contractType: data.contractType,
        startDate: toApiDateUtcNoon(data.startDate),
        endDate: data.endDate ? toApiDateUtcNoon(data.endDate) : null,
        salary: data.salary,
        status: data.status,
        notes: data.notes ?? null,
      },
      include: { employee: { include: { department: true, position: true } } },
    });

    res.status(201).json(serializeContractDetail(contract));
  })
);

router.patch(
  "/contracts/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = contractIdSchema.safeParse(req.params);
    const bodyParsed = updateContractSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.employeeContract.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    const body = bodyParsed.data;

    // DRAFT: full edit. ACTIVE: notes/dates/salary/type only (status allowed for lifecycle).
    // EXPIRED/TERMINATED: notes only.
    if (existing.status === "EXPIRED" || existing.status === "TERMINATED") {
      const disallowed = [
        body.contractType,
        body.startDate,
        body.endDate,
        body.salary,
        body.status,
      ].some((v) => v !== undefined);
      if (disallowed) {
        res.status(400).json({
          error: `Only notes can be edited when contract status is ${existing.status}`,
        });
        return;
      }
    } else if (existing.status === "ACTIVE") {
      // status transitions allowed; structural fields allowed
    } else if (existing.status !== "DRAFT") {
      res.status(400).json({ error: `Cannot edit contract in status ${existing.status}` });
      return;
    }

    const nextStart =
      body.startDate !== undefined
        ? body.startDate
        : existing.startDate.toISOString().slice(0, 10);
    const nextEnd =
      body.endDate !== undefined
        ? body.endDate
        : (existing.endDate?.toISOString().slice(0, 10) ?? null);
    if (nextEnd && compareApiDateStrings(nextStart, nextEnd) > 0) {
      res.status(400).json({ error: "startDate must be on or before endDate" });
      return;
    }

    const contract = await prisma.employeeContract.update({
      where: { id: existing.id },
      data: {
        ...(body.contractType !== undefined ? { contractType: body.contractType } : {}),
        ...(body.startDate !== undefined ? { startDate: toApiDateUtcNoon(body.startDate) } : {}),
        ...(body.endDate !== undefined
          ? { endDate: body.endDate ? toApiDateUtcNoon(body.endDate) : null }
          : {}),
        ...(body.salary !== undefined ? { salary: body.salary } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { employee: { include: { department: true, position: true } } },
    });

    res.json(serializeContractDetail(contract));
  })
);

router.get(
  "/documents",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = documentsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, documentType, expiryState, sort } = parsed.data;
    const skip = (page - 1) * limit;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonLimit = new Date(today);
    soonLimit.setDate(soonLimit.getDate() + 60);

    const andFilters: Prisma.EmployeeDocumentWhereInput[] = [];

    if (expiryState === "expired") {
      andFilters.push({
        OR: [
          { status: "EXPIRED" },
          { expiryDate: { lt: today }, NOT: { status: "MISSING" } },
        ],
      });
    } else if (expiryState === "expiring_soon") {
      andFilters.push({
        status: { in: ["VALID", "PENDING_REVIEW"] },
        expiryDate: { gte: today, lte: soonLimit },
      });
    } else if (expiryState === "ok") {
      andFilters.push({
        status: { notIn: ["EXPIRED", "MISSING"] },
        OR: [{ expiryDate: null }, { expiryDate: { gt: soonLimit } }],
      });
    }

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { documentType: { contains: search, mode: "insensitive" } },
          { employee: { firstName: { contains: search, mode: "insensitive" } } },
          { employee: { lastName: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.EmployeeDocumentWhereInput = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(documentType
        ? { documentType: { contains: documentType, mode: "insensitive" } }
        : {}),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    const [documents, total] = await Promise.all([
      prisma.employeeDocument.findMany({
        where,
        include: { employee: { include: { department: true, position: true } } },
        orderBy: documentListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.employeeDocument.count({ where }),
    ]);

    res.json({
      data: documents.map(serializeDocument),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/documents/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = documentIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }

    const document = await prisma.employeeDocument.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: { employee: { include: { department: true, position: true } } },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(serializeDocumentDetail(document));
  })
);

router.post(
  "/documents",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId: orgId },
    });
    if (!employee) {
      res.status(400).json({ error: "Employee not found" });
      return;
    }

    const document = await prisma.employeeDocument.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        documentType: data.documentType,
        title: data.title,
        fileUrl: data.fileUrl ?? null,
        expiryDate: data.expiryDate ? toApiDateUtcNoon(data.expiryDate) : null,
        status: data.status,
        notes: data.notes ?? null,
      },
      include: { employee: { include: { department: true, position: true } } },
    });

    res.status(201).json(serializeDocumentDetail(document));
  })
);

router.patch(
  "/documents/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = documentIdSchema.safeParse(req.params);
    const bodyParsed = updateHrDocumentSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.employeeDocument.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const body = bodyParsed.data;
    const document = await prisma.employeeDocument.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
        ...(body.fileUrl !== undefined ? { fileUrl: body.fileUrl } : {}),
        ...(body.expiryDate !== undefined
          ? { expiryDate: body.expiryDate ? toApiDateUtcNoon(body.expiryDate) : null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: { employee: { include: { department: true, position: true } } },
    });

    res.json(serializeDocumentDetail(document));
  })
);

router.get(
  "/positions",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = positionsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, departmentId, active, sort } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(departmentId ? { departmentId } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { level: { contains: search, mode: "insensitive" as const } },
              { department: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        include: { department: true, _count: { select: { employees: true } } },
        orderBy: positionListOrderBy(sort),
        skip,
        take: limit,
      }),
      prisma.position.count({ where }),
    ]);

    res.json({
      data: positions.map(serializePosition),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/positions/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = positionIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid position id" });
      return;
    }

    const position = await prisma.position.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        department: true,
        employees: { where: { isActive: true }, orderBy: [{ lastName: "asc" }] },
        _count: { select: { employees: true } },
      },
    });

    if (!position) {
      res.status(404).json({ error: "Position not found" });
      return;
    }

    res.json(serializePositionDetail(position));
  })
);

router.post(
  "/positions",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createPositionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, organizationId: orgId },
    });
    if (!department) {
      res.status(400).json({ error: "Department not found" });
      return;
    }

    const position = await prisma.position.create({
      data: {
        organizationId: orgId,
        departmentId: data.departmentId,
        title: data.title,
        level: data.level,
        isActive: data.isActive,
      },
      include: { department: true, _count: { select: { employees: true } } },
    });

    res.status(201).json(serializePosition(position));
  })
);

router.patch(
  "/positions/:id",
  requirePermission(HR_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = positionIdSchema.safeParse(req.params);
    const bodyParsed = updatePositionSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.position.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Position not found" });
      return;
    }

    const body = bodyParsed.data;
    if (body.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: body.departmentId, organizationId: orgId },
      });
      if (!department) {
        res.status(400).json({ error: "Department not found in this organization" });
        return;
      }
    }

    const position = await prisma.position.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.level !== undefined ? { level: body.level } : {}),
        ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: {
        department: true,
        employees: { where: { isActive: true }, orderBy: [{ lastName: "asc" }] },
        _count: { select: { employees: true } },
      },
    });

    res.json(serializePositionDetail(position));
  })
);

export default router;
