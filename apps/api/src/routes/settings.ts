import { Router } from "express";
import {
  AUDIT_PERMISSIONS,
  ROLES_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  USERS_PERMISSIONS,
} from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  getUserPermissions,
  invalidateAllPermissionCaches,
} from "../lib/permissions.js";
import { revokeAuthzForOrganization } from "../lib/authz-cache.js";
import {
  auditLogsListSchema,
  updateOrganizationSchema,
  updatePreferencesSchema,
  updateRolePermissionsSchema,
  usersListSchema,
} from "../lib/settings-validation.js";
import {
  serializeAuditLog,
  serializeBranch,
  serializePermission,
  serializePreference,
  serializeSettingsOrganization,
  serializeSettingsRole,
  serializeSettingsUser,
} from "../lib/serialize-settings.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { PRESENCE_AWAY_MS, PRESENCE_ONLINE_MS } from "@ierp/shared";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/overview",
  requirePermission(SETTINGS_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;

    const [organization, branchCount, userCount, roleCount, permissionCount, preferenceCount, recentAuditLogs] =
      await Promise.all([
        prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
        prisma.branch.count({ where: { organizationId: orgId } }),
        prisma.user.count({ where: { organizationId: orgId } }),
        prisma.role.count({ where: { organizationId: orgId } }),
        prisma.permission.count(),
        prisma.systemPreference.count({ where: { organizationId: orgId } }),
        prisma.auditLog.findMany({
          where: { organizationId: orgId },
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    res.json({
      organization: serializeSettingsOrganization(organization),
      branchCount,
      userCount,
      roleCount,
      permissionCount,
      preferenceCount,
      recentAuditLogs: recentAuditLogs.map(serializeAuditLog),
    });
  })
);

router.get(
  "/organization",
  requirePermission(SETTINGS_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: req.user!.organizationId },
    });
    res.json({ organization: serializeSettingsOrganization(organization) });
  })
);

router.patch(
  "/organization",
  requirePermission(SETTINGS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const body = updateOrganizationSchema.parse(req.body);
    const organization = await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: body,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: req.user!.userId,
        action: "settings.organization.updated",
        entity: "Organization",
        entityId: organization.id,
        details: body,
      },
    });

    res.json({ organization: serializeSettingsOrganization(organization) });
  })
);

router.get(
  "/branches",
  requirePermission(SETTINGS_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const branches = await prisma.branch.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { code: "asc" },
    });
    res.json({ data: branches.map(serializeBranch) });
  })
);

router.get(
  "/users",
  requirePermission(USERS_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = usersListSchema.parse(req.query);
    const page = parsed.page;
    const limit = parsed.pageSize ?? parsed.limit;
    const {
      search,
      role,
      status = "all",
      presence = "all",
      sortBy = "name",
      sortOrder = "asc",
    } = parsed;
    const orgId = req.user!.organizationId;
    const now = new Date();
    const onlineSince = new Date(now.getTime() - PRESENCE_ONLINE_MS);
    const awaySince = new Date(now.getTime() - PRESENCE_AWAY_MS);

    const and: Prisma.UserWhereInput[] = [{ organizationId: orgId }];

    if (status === "active") and.push({ isActive: true });
    if (status === "inactive") and.push({ isActive: false });

    if (role) {
      and.push({
        userRoles: {
          some: {
            role: {
              OR: [
                { code: { equals: role, mode: "insensitive" } },
                { id: role },
                { name: { equals: role, mode: "insensitive" } },
              ],
            },
          },
        },
      });
    }

    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (presence === "online") {
      and.push({ lastActiveAt: { gte: onlineSince } });
    } else if (presence === "away") {
      and.push({ lastSeenAt: { gte: awaySince } });
      and.push({
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: onlineSince } }],
      });
    } else if (presence === "offline") {
      and.push({
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: awaySince } }],
      });
    }

    const where: Prisma.UserWhereInput = { AND: and };

    const orderBy: Prisma.UserOrderByWithRelationInput =
      sortBy === "email"
        ? { email: sortOrder }
        : sortBy === "createdAt"
          ? { createdAt: sortOrder }
          : sortBy === "lastLoginAt"
            ? { lastLoginAt: sortOrder }
            : { name: sortOrder };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users.map(serializeSettingsUser),
      pagination: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

router.get(
  "/roles",
  requirePermission(ROLES_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const roles = await prisma.role.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ data: roles.map(serializeSettingsRole) });
  })
);

router.get(
  "/permissions",
  requirePermission(ROLES_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ section: "asc" }, { action: "asc" }],
    });
    res.json({ data: permissions.map(serializePermission) });
  })
);

router.patch(
  "/roles/:id/permissions",
  requirePermission(ROLES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const roleId = String(req.params.id);
    const orgId = req.user!.organizationId;
    const body = updateRolePermissionsSchema.parse(req.body);

    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
    });
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    const permissionIds = body.permissions.map((p) => p.permissionId);
    const catalog = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });
    if (catalog.length !== permissionIds.length) {
      res.status(400).json({ error: "One or more permission IDs are invalid" });
      return;
    }

    const grantedKeys = new Set(
      body.permissions.filter((p) => p.granted).map((p) => {
        const perm = catalog.find((c) => c.id === p.permissionId)!;
        return `${perm.section}.${perm.action}`;
      })
    );

    const currentUserRoles = await prisma.userRole.findMany({
      where: { userId: req.user!.userId },
      include: { role: true },
    });
    const editingOwnRole = currentUserRoles.some((ur) => ur.roleId === roleId);
    if (editingOwnRole) {
      const critical = [ROLES_PERMISSIONS.WRITE, ROLES_PERMISSIONS.READ, SETTINGS_PERMISSIONS.READ];
      const currentPerms = await getUserPermissions(req.user!.userId);
      for (const key of critical) {
        if (currentPerms.includes(key) && !grantedKeys.has(key)) {
          res.status(400).json({ error: `Cannot revoke your own access: ${key}` });
          return;
        }
      }
    }

    await Promise.all(
      body.permissions.map((entry) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId: entry.permissionId },
          },
          update: { granted: entry.granted },
          create: {
            roleId,
            permissionId: entry.permissionId,
            granted: entry.granted,
          },
        })
      )
    );

    invalidateAllPermissionCaches();
    await revokeAuthzForOrganization(orgId);

    const updated = await prisma.role.findUniqueOrThrow({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: req.user!.userId,
        action: "settings.roles.permissions.updated",
        entity: "Role",
        entityId: roleId,
        details: {
          roleCode: role.code,
          grantedCount: body.permissions.filter((p) => p.granted).length,
        },
      },
    });

    res.json({ role: serializeSettingsRole(updated) });
  })
);

router.get(
  "/preferences",
  requirePermission(SETTINGS_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const preferences = await prisma.systemPreference.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });
    res.json({ data: preferences.map(serializePreference) });
  })
);

router.patch(
  "/preferences",
  requirePermission(SETTINGS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { preferences } = updatePreferencesSchema.parse(req.body);
    const orgId = req.user!.organizationId;

    const updated = await Promise.all(
      preferences.map(async (pref) => {
        const existing = await prisma.systemPreference.findUnique({
          where: { organizationId_key: { organizationId: orgId, key: pref.key } },
        });
        if (!existing) {
          res.status(400).json({ error: `Unknown preference key: ${pref.key}` });
          return null;
        }
        return prisma.systemPreference.update({
          where: { organizationId_key: { organizationId: orgId, key: pref.key } },
          data: { value: pref.value },
        });
      })
    );

    if (updated.some((item) => item === null)) return;

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: req.user!.userId,
        action: "settings.preferences.updated",
        entity: "SystemPreference",
        details: { keys: preferences.map((p) => p.key) },
      },
    });

    res.json({ data: updated.filter(Boolean).map((item) => serializePreference(item!)) });
  })
);

router.get(
  "/audit-logs",
  requirePermission(AUDIT_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = auditLogsListSchema.parse(req.query);
    const page = parsed.page;
    const limit = parsed.pageSize ?? parsed.limit;
    const { search, action, entity, userId, from, to } = parsed;
    const orgId = req.user!.organizationId;

    const and: Prisma.AuditLogWhereInput[] = [{ organizationId: orgId }];

    if (action) and.push({ action: { contains: action, mode: "insensitive" } });
    if (entity) and.push({ entity: { contains: entity, mode: "insensitive" } });
    if (userId) and.push({ userId });

    if (from) {
      const fromDate = new Date(from.length === 10 ? `${from}T00:00:00.000Z` : from);
      if (!Number.isNaN(fromDate.getTime())) and.push({ createdAt: { gte: fromDate } });
    }
    if (to) {
      const toDate = new Date(to.length === 10 ? `${to}T23:59:59.999Z` : to);
      if (!Number.isNaN(toDate.getTime())) and.push({ createdAt: { lte: toDate } });
    }

    if (search) {
      and.push({
        OR: [
          { action: { contains: search, mode: "insensitive" } },
          { entity: { contains: search, mode: "insensitive" } },
          { entityId: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const where: Prisma.AuditLogWhereInput = { AND: and };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs.map(serializeAuditLog),
      pagination: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  })
);

export default router;
