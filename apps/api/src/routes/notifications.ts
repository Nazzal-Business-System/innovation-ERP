import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { NOTIFICATIONS_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  notificationIdSchema,
  notificationsListSchema,
} from "../lib/notifications-validation.js";
import { serializeNotification } from "../lib/serialize-notifications.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(NOTIFICATIONS_PERMISSIONS.READ));

function userScope(req: AuthenticatedRequest) {
  return {
    organizationId: req.user!.organizationId,
    userId: req.user!.userId,
  };
}

function notificationWhere(organizationId: string, userId: string): Prisma.NotificationWhereInput {
  return {
    organizationId,
    OR: [{ userId }, { userId: null }],
  };
}

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { organizationId, userId } = userScope(req);
    const where = notificationWhere(organizationId, userId);

    const [unreadCount, recent] = await Promise.all([
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    res.json({
      unreadCount,
      recent: recent.map(serializeNotification),
    });
  })
);

router.get(
  "/unread-count",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { organizationId, userId } = userScope(req);
    const unreadCount = await prisma.notification.count({
      where: { ...notificationWhere(organizationId, userId), isRead: false },
    });
    res.json({ unreadCount });
  })
);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { organizationId, userId } = userScope(req);
    const { page, limit, unreadOnly, type, module } = notificationsListSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      ...notificationWhere(organizationId, userId),
      ...(unreadOnly ? { isRead: false } : {}),
      ...(type ? { type } : {}),
      ...(module ? { module } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map(serializeNotification),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

router.patch(
  "/read-all",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { organizationId, userId } = userScope(req);

    const result = await prisma.notification.updateMany({
      where: { ...notificationWhere(organizationId, userId), isRead: false },
      data: { isRead: true },
    });

    res.json({ updated: result.count });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { organizationId, userId } = userScope(req);
    const { id } = notificationIdSchema.parse(req.params);

    const existing = await prisma.notification.findFirst({
      where: { id, ...notificationWhere(organizationId, userId) },
    });

    if (!existing) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ notification: serializeNotification(updated) });
  })
);

export default router;
