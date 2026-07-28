import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { HR_SELF_PERMISSIONS, inclusiveCalendarDays } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  EmployeeSelfServiceError,
  resolveLinkedEmployee,
} from "../lib/employee-self-service.js";
import {
  AVATAR_MAX_BYTES,
  decodeBase64Image,
  deleteEmployeeAvatar,
  extensionForMime,
  mimeForExtension,
  resolveStoragePath,
  writeEmployeeAvatar,
} from "../lib/avatar-storage.js";
import {
  fullName,
  serializeAttendance,
  serializeContract,
  serializeDocument,
  serializeEmployee,
  serializeEmployeeProfilePayrollLine,
  serializeLeaveRequest,
} from "../lib/serialize-hr.js";
import { apiDateSchema, toApiDateUtcNoon } from "../lib/api-date.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { requireEmployeeSelfService } from "../middleware/require-employee-self-service.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { uploadAvatarSchema } from "../lib/auth-profile-validation.js";

function todayApiDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function routeParamId(req: AuthenticatedRequest, key = "id"): string {
  const raw = req.params[key];
  return Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
}

const router = Router();

const leaveInclude = {
  employee: { include: { department: true, position: true } },
  approvedBy: true,
  assignedApprover: true,
  decidedBy: true,
} as const;

const attendanceInclude = {
  employee: { include: { department: true } },
} as const;

const contractInclude = {
  employee: { include: { department: true, position: true } },
} as const;

const documentInclude = {
  employee: { include: { department: true, position: true } },
} as const;

const selfLeaveCreateSchema = z
  .object({
    type: z.enum(["ANNUAL", "SICK", "UNPAID", "EMERGENCY"]),
    startDate: apiDateSchema,
    endDate: apiDateSchema,
    reason: z.string().trim().optional(),
    assignedApproverId: z.string().uuid().optional(),
    /** Ignored — server recalculates inclusive calendar days. */
    days: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be on or before endDate",
        path: ["endDate"],
      });
    }
  });

const selfCheckInSchema = z.object({
  /** Employee-selectable mode. LATE/ABSENT are never accepted from the client. */
  mode: z.enum(["PRESENT", "REMOTE", "HALF_DAY"]).default("PRESENT"),
  notes: z
    .union([z.string().trim().max(500), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : v)),
});

const selfProfilePatchSchema = z
  .object({
    phone: z.string().trim().max(40).nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

async function withLinkedEmployee(
  req: AuthenticatedRequest,
  res: import("express").Response,
  fn: (employee: Awaited<ReturnType<typeof resolveLinkedEmployee>>) => Promise<void>
) {
  try {
    const employee = await resolveLinkedEmployee({
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
    });
    await fn(employee);
  } catch (err) {
    if (err instanceof EmployeeSelfServiceError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
}

function formatTimeHHmm(date: Date): string {
  return date.toISOString().slice(11, 16);
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(HR_SELF_PERMISSIONS.READ));
router.use(requireEmployeeSelfService());

router.get(
  "/me",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      res.json({
        ...serializeEmployee(employee, { includeSalary: true }),
        canViewSalary: true,
        manager: employee.manager
          ? {
              id: employee.manager.id,
              fullName: fullName(employee.manager.firstName, employee.manager.lastName),
            }
          : null,
      });
    });
  })
);

router.patch(
  "/me",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const parsed = selfProfilePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid profile update", details: parsed.error.flatten() });
        return;
      }

      const updated = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
        },
        include: {
          department: true,
          position: true,
          manager: true,
        },
      });

      res.json({
        ...serializeEmployee(updated, { includeSalary: true }),
        canViewSalary: true,
      });
    });
  })
);

router.get(
  "/me/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const orgId = req.user!.organizationId;
      const today = todayApiDateString();
      const todayDate = toApiDateUtcNoon(today);

      const [
        todayAttendance,
        pendingLeaveCount,
        latestPayroll,
        activeContract,
        expiringDocuments,
        unreadNotifications,
        recentArticles,
      ] = await Promise.all([
        prisma.attendanceRecord.findFirst({
          where: { organizationId: orgId, employeeId: employee.id, date: todayDate },
          include: attendanceInclude,
        }),
        prisma.leaveRequest.count({
          where: { organizationId: orgId, employeeId: employee.id, status: "PENDING" },
        }),
        prisma.payrollLine.findFirst({
          where: { organizationId: orgId, employeeId: employee.id },
          include: {
            payrollRun: {
              select: { id: true, runNumber: true, periodStart: true, periodEnd: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.employeeContract.findFirst({
          where: { organizationId: orgId, employeeId: employee.id, status: "ACTIVE" },
          include: contractInclude,
          orderBy: { startDate: "desc" },
        }),
        prisma.employeeDocument.findMany({
          where: {
            organizationId: orgId,
            employeeId: employee.id,
            status: { in: ["VALID", "PENDING_REVIEW", "EXPIRED"] },
            OR: [
              { status: "EXPIRED" },
              {
                expiryDate: {
                  lte: toApiDateUtcNoon(
                    new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
                  ),
                },
              },
            ],
          },
          include: documentInclude,
          orderBy: { expiryDate: "asc" },
          take: 5,
        }),
        prisma.notification.count({
          where: {
            organizationId: orgId,
            isRead: false,
            OR: [{ userId: req.user!.userId }, { userId: null }],
          },
        }),
        prisma.knowledgeArticle.findMany({
          where: {
            organizationId: orgId,
            status: "PUBLISHED",
            visibility: { in: ["INTERNAL", "PUBLIC"] },
          },
          orderBy: { publishedAt: "desc" },
          take: 5,
          select: {
            id: true,
            articleNumber: true,
            title: true,
            summary: true,
            publishedAt: true,
            category: { select: { id: true, name: true } },
          },
        }),
      ]);

      res.json({
        profile: serializeEmployee(employee, { includeSalary: true }),
        todayAttendance: todayAttendance ? serializeAttendance(todayAttendance) : null,
        todayDate: today,
        pendingLeaveCount,
        latestPayroll: latestPayroll
          ? serializeEmployeeProfilePayrollLine(latestPayroll, { includeBreakdown: true })
          : null,
        activeContract: activeContract ? serializeContract(activeContract) : null,
        expiringDocuments: expiringDocuments.map(serializeDocument),
        unreadNotifications,
        recentKnowledge: recentArticles.map((a) => ({
          id: a.id,
          articleNumber: a.articleNumber,
          title: a.title,
          summary: a.summary,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          category: a.category,
        })),
        canCheckIn: !todayAttendance?.checkIn,
        canCheckOut: Boolean(todayAttendance?.checkIn && !todayAttendance?.checkOut),
      });
    });
  })
);

router.get(
  "/me/attendance",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const from =
        typeof req.query.from === "string" && req.query.from
          ? toApiDateUtcNoon(req.query.from)
          : null;
      const to =
        typeof req.query.to === "string" && req.query.to ? toApiDateUtcNoon(req.query.to) : null;

      const where = {
        organizationId: req.user!.organizationId,
        employeeId: employee.id,
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      };

      const [records, present, remote, late, absent, halfDay] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where,
          include: attendanceInclude,
          orderBy: { date: "desc" },
          take: 60,
        }),
        prisma.attendanceRecord.count({ where: { ...where, status: "PRESENT" } }),
        prisma.attendanceRecord.count({ where: { ...where, status: "REMOTE" } }),
        prisma.attendanceRecord.count({ where: { ...where, status: "LATE" } }),
        prisma.attendanceRecord.count({ where: { ...where, status: "ABSENT" } }),
        prisma.attendanceRecord.count({ where: { ...where, status: "HALF_DAY" } }),
      ]);

      const today = todayApiDateString();
      const todayRecord = records.find((r) => r.date.toISOString().slice(0, 10) === today) ?? null;

      res.json({
        data: records.map(serializeAttendance),
        summary: { present, remote, late, absent, halfDay, total: records.length },
        today: todayRecord ? serializeAttendance(todayRecord) : null,
        todayDate: today,
        canCheckIn: !todayRecord?.checkIn,
        canCheckOut: Boolean(todayRecord?.checkIn && !todayRecord?.checkOut),
      });
    });
  })
);

router.post(
  "/me/attendance/check-in",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const parsed = selfCheckInSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid check-in request",
          code: "INVALID_CHECK_IN",
          details: parsed.error.flatten(),
        });
        return;
      }

      const orgId = req.user!.organizationId;
      const today = todayApiDateString();
      const todayDate = toApiDateUtcNoon(today);
      const now = new Date();
      const mode = parsed.data.mode;
      const notes = parsed.data.notes;

      const existing = await prisma.attendanceRecord.findFirst({
        where: { organizationId: orgId, employeeId: employee.id, date: todayDate },
      });

      if (existing?.checkIn) {
        res.status(409).json({
          error: "You are already checked in for today",
          code: "ALREADY_CHECKED_IN",
        });
        return;
      }

      if (existing?.checkOut) {
        res.status(409).json({
          error: "Attendance for today is already complete",
          code: "ALREADY_CHECKED_OUT",
        });
        return;
      }

      // Late is calculated only for on-site (PRESENT) check-ins. Remote/Half Day keep their mode.
      const hour = now.getUTCHours();
      const status =
        mode === "PRESENT" ? (hour >= 9 ? "LATE" : "PRESENT") : mode;

      const record = existing
        ? await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              checkIn: now,
              status,
              notes: notes ?? existing.notes,
            },
            include: attendanceInclude,
          })
        : await prisma.attendanceRecord.create({
            data: {
              organizationId: orgId,
              employeeId: employee.id,
              date: todayDate,
              checkIn: now,
              checkOut: null,
              status,
              notes,
            },
            include: attendanceInclude,
          });

      res.status(201).json({
        data: serializeAttendance(record),
        message: `Checked in at ${formatTimeHHmm(now)} UTC`,
      });
    });
  })
);

router.post(
  "/me/attendance/check-out",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const orgId = req.user!.organizationId;
      const today = todayApiDateString();
      const todayDate = toApiDateUtcNoon(today);
      const now = new Date();

      const existing = await prisma.attendanceRecord.findFirst({
        where: { organizationId: orgId, employeeId: employee.id, date: todayDate },
      });

      if (!existing || !existing.checkIn) {
        res.status(409).json({
          error: "Check in before checking out",
          code: "INVALID_SEQUENCE",
        });
        return;
      }

      if (existing.checkOut) {
        res.status(409).json({
          error: "You are already checked out for today",
          code: "ALREADY_CHECKED_OUT",
        });
        return;
      }

      const record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { checkOut: now },
        include: attendanceInclude,
      });

      res.json({
        data: serializeAttendance(record),
        message: `Checked out at ${formatTimeHHmm(now)} UTC`,
      });
    });
  })
);

router.get(
  "/me/leave-requests",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const leaves = await prisma.leaveRequest.findMany({
        where: { organizationId: req.user!.organizationId, employeeId: employee.id },
        include: leaveInclude,
        orderBy: { startDate: "desc" },
        take: 40,
      });
      res.json({ data: leaves.map(serializeLeaveRequest) });
    });
  })
);

router.get(
  "/me/leave-requests/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const leave = await prisma.leaveRequest.findFirst({
        where: {
          id: routeParamId(req),
          organizationId: req.user!.organizationId,
          employeeId: employee.id,
        },
        include: leaveInclude,
      });
      if (!leave) {
        res.status(404).json({ error: "Leave request not found" });
        return;
      }
      res.json(serializeLeaveRequest(leave));
    });
  })
);

router.post(
  "/me/leave-requests",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const parsed = selfLeaveCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid leave request", details: parsed.error.flatten() });
        return;
      }

      const data = parsed.data;
      const days = inclusiveCalendarDays(data.startDate, data.endDate);
      if (days < 1) {
        res.status(400).json({ error: "Leave duration must be at least 1 day" });
        return;
      }

      let assignedApproverId = data.assignedApproverId ?? employee.managerId ?? null;
      if (assignedApproverId) {
        const approver = await prisma.employee.findFirst({
          where: {
            id: assignedApproverId,
            organizationId: req.user!.organizationId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!approver) assignedApproverId = null;
      }

      const created = await prisma.leaveRequest.create({
        data: {
          organizationId: req.user!.organizationId,
          employeeId: employee.id,
          type: data.type,
          startDate: toApiDateUtcNoon(data.startDate),
          endDate: toApiDateUtcNoon(data.endDate),
          days,
          reason: data.reason ?? null,
          status: "PENDING",
          assignedApproverId,
        },
        include: leaveInclude,
      });

      res.status(201).json(serializeLeaveRequest(created));
    });
  })
);

router.post(
  "/me/leave-requests/:id/cancel",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const leaveId = routeParamId(req);
      const leave = await prisma.leaveRequest.findFirst({
        where: {
          id: leaveId,
          organizationId: req.user!.organizationId,
          employeeId: employee.id,
        },
      });
      if (!leave) {
        res.status(404).json({ error: "Leave request not found" });
        return;
      }
      if (leave.status !== "PENDING") {
        res.status(409).json({
          error: "Only pending leave requests can be cancelled",
          code: "LEAVE_NOT_PENDING",
        });
        return;
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: "CANCELLED", decidedAt: new Date(), decidedById: req.user!.userId },
        include: leaveInclude,
      });

      res.json(serializeLeaveRequest(updated));
    });
  })
);

router.get(
  "/me/payroll",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const lines = await prisma.payrollLine.findMany({
        where: { organizationId: req.user!.organizationId, employeeId: employee.id },
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
        take: 24,
      });
      const data = lines.map((line) =>
        serializeEmployeeProfilePayrollLine(line, { includeBreakdown: true })
      );
      res.json({ data, latest: data[0] ?? null });
    });
  })
);

router.get(
  "/me/contract",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const contracts = await prisma.employeeContract.findMany({
        where: { organizationId: req.user!.organizationId, employeeId: employee.id },
        include: contractInclude,
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
        take: 20,
      });
      const active = contracts.find((c) => c.status === "ACTIVE") ?? null;
      const history = contracts.filter((c) => c.id !== active?.id);
      res.json({
        data: active ? serializeContract(active) : null,
        active: active ? serializeContract(active) : null,
        history: history.map(serializeContract),
        hasAny: contracts.length > 0,
      });
    });
  })
);

router.get(
  "/me/documents",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const docs = await prisma.employeeDocument.findMany({
        where: { organizationId: req.user!.organizationId, employeeId: employee.id },
        include: documentInclude,
        orderBy: { updatedAt: "desc" },
        take: 40,
      });
      res.json({
        data: docs.map((doc) => ({
          ...serializeDocument(doc),
          canDownload: doc.status !== "MISSING" && Boolean(doc.fileUrl || doc.status === "VALID"),
          downloadPath: `/self-service/me/documents/${doc.id}/file`,
        })),
      });
    });
  })
);

router.get(
  "/me/documents/:id/file",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const doc = await prisma.employeeDocument.findFirst({
        where: {
          id: routeParamId(req),
          organizationId: req.user!.organizationId,
          employeeId: employee.id,
        },
      });
      if (!doc) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      if (doc.status === "MISSING" || (!doc.fileUrl && doc.status !== "VALID")) {
        res.status(404).json({
          error: "This document file is not available",
          code: "FILE_UNAVAILABLE",
        });
        return;
      }

      const safeName = `${doc.title.replace(/[^\w\- ]+/g, "").trim() || "document"}.txt`;
      const body = [
        "Innovation ERP — Employee Document",
        "================================",
        `Title: ${doc.title}`,
        `Type: ${doc.documentType}`,
        `Status: ${doc.status}`,
        `Employee: ${employee.employeeNumber}`,
        doc.expiryDate ? `Expiry: ${doc.expiryDate.toISOString().slice(0, 10)}` : null,
        doc.notes ? `Notes: ${doc.notes}` : null,
        "",
        "This is an authorized employee self-service download.",
        "Internal storage paths are not exposed.",
      ]
        .filter(Boolean)
        .join("\n");

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.send(body);
    });
  })
);

router.get(
  "/me/avatar",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      if (!employee.avatarPath) {
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
    });
  })
);

router.post(
  "/me/avatar",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      const bodyParsed = uploadAvatarSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        res.status(400).json({ error: "Invalid avatar upload", details: bodyParsed.error.flatten() });
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

      let relativePath: string;
      try {
        relativePath = await writeEmployeeAvatar({
          organizationId: req.user!.organizationId,
          employeeId: employee.id,
          mimeType: bodyParsed.data.mimeType,
          buffer,
          previousPath: employee.avatarPath,
        });
      } catch {
        res.status(400).json({ error: "Unable to save avatar" });
        return;
      }

      const updated = await prisma.employee.update({
        where: { id: employee.id },
        data: { avatarPath: relativePath },
        include: { department: true, position: true, manager: true },
      });

      res.json({
        ...serializeEmployee(updated, { includeSalary: true }),
        canViewSalary: true,
      });
    });
  })
);

router.delete(
  "/me/avatar",
  requirePermission(HR_SELF_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await withLinkedEmployee(req, res, async (employee) => {
      await deleteEmployeeAvatar(employee.avatarPath);
      const updated = await prisma.employee.update({
        where: { id: employee.id },
        data: { avatarPath: null },
        include: { department: true, position: true, manager: true },
      });
      res.json({
        ...serializeEmployee(updated, { includeSalary: true }),
        canViewSalary: true,
      });
    });
  })
);

/** Published INTERNAL/PUBLIC knowledge for employees (not drafts/support-only). */
router.get(
  "/knowledge/categories",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const categories = await prisma.knowledgeCategory.findMany({
      where: { organizationId: req.user!.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, description: true },
    });
    res.json({ data: categories });
  })
);

router.get(
  "/knowledge/articles",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId.trim() : "";

    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        organizationId: req.user!.organizationId,
        status: "PUBLISHED",
        visibility: { in: ["INTERNAL", "PUBLIC"] },
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { summary: { contains: search, mode: "insensitive" } },
                { articleNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 40,
      select: {
        id: true,
        articleNumber: true,
        title: true,
        summary: true,
        publishedAt: true,
        visibility: true,
        category: { select: { id: true, name: true } },
        tags: { select: { id: true, tag: true } },
      },
    });

    res.json({
      data: articles.map((a) => ({
        id: a.id,
        articleNumber: a.articleNumber,
        title: a.title,
        summary: a.summary,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        visibility: a.visibility,
        category: a.category,
        tags: a.tags.map((t) => ({ id: t.id, name: t.tag })),
      })),
    });
  })
);

router.get(
  "/knowledge/articles/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const article = await prisma.knowledgeArticle.findFirst({
      where: {
        id: routeParamId(req),
        organizationId: req.user!.organizationId,
        status: "PUBLISHED",
        visibility: { in: ["INTERNAL", "PUBLIC"] },
      },
      include: {
        category: { select: { id: true, name: true } },
        tags: { select: { id: true, tag: true } },
        author: { select: { id: true, name: true } },
      },
    });
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({
      id: article.id,
      articleNumber: article.articleNumber,
      title: article.title,
      summary: article.summary,
      content: article.content,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      visibility: article.visibility,
      category: article.category,
      tags: article.tags.map((t) => ({ id: t.id, name: t.tag })),
      author: article.author,
    });
  })
);

/** Company policies/procedures/handbooks — excludes finance/invoice categories. */
const EMPLOYEE_DOC_CATEGORY_CODES = ["POLICY", "COMPLIANCE", "HR_DOC"] as const;

router.get(
  "/company-documents",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const files = await prisma.documentFile.findMany({
      where: {
        organizationId: req.user!.organizationId,
        status: "ACTIVE",
        category: { code: { in: [...EMPLOYEE_DOC_CATEGORY_CODES] } },
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { fileNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { uploadedAt: "desc" },
      take: 40,
      select: {
        id: true,
        fileNumber: true,
        title: true,
        description: true,
        mimeType: true,
        fileSize: true,
        expiryDate: true,
        uploadedAt: true,
        category: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({
      data: files.map((f) => ({
        ...f,
        expiryDate: f.expiryDate?.toISOString() ?? null,
        uploadedAt: f.uploadedAt.toISOString(),
        downloadPath: `/self-service/company-documents/${f.id}/file`,
      })),
    });
  })
);

router.get(
  "/company-documents/:id/file",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const file = await prisma.documentFile.findFirst({
      where: {
        id: routeParamId(req),
        organizationId: req.user!.organizationId,
        status: "ACTIVE",
        category: { code: { in: [...EMPLOYEE_DOC_CATEGORY_CODES] } },
      },
      include: { category: true },
    });
    if (!file) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const safeName = `${file.title.replace(/[^\w\- ]+/g, "").trim() || file.fileNumber}.txt`;
    const body = [
      "Innovation ERP — Company Document",
      "================================",
      `Title: ${file.title}`,
      `Number: ${file.fileNumber}`,
      `Category: ${file.category?.name ?? "—"}`,
      file.description ? `Description: ${file.description}` : null,
      "",
      "Authorized employee self-service copy.",
      "Restricted finance and administrative files are not included in this catalog.",
    ]
      .filter(Boolean)
      .join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(body);
  })
);

export default router;
