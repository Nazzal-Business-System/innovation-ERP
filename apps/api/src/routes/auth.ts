import { Router } from "express";
import jwt from "jsonwebtoken";
import fs from "node:fs/promises";
import path from "node:path";
import { loginSchema } from "../lib/validation.js";
import {
  changePasswordSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from "../lib/auth-profile-validation.js";
import {
  normalizeExpandedGroups,
  normalizeSidebarPins,
  parseStoredUiPreferences,
  updateUiPreferencesSchema,
} from "../lib/ui-preferences.js";
import { isKnownNavItemId, EXECUTIVE_PERMISSIONS, HR_PERMISSIONS, HR_SELF_PERMISSIONS, hasPermission } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import { comparePassword, hashPassword } from "../lib/password.js";
import { assertJwtSecret, signToken, JwtConfigError, type JwtPayload } from "../lib/jwt.js";
import {
  authSessionInclude,
  cacheRolesAndPermissionsFromUserRoles,
} from "../lib/permissions.js";
import {
  bumpAuthVersion,
  ensureAuthVersion,
  getCachedAuthz,
  seedAuthzSnapshot,
} from "../lib/authz-cache.js";
import { serializeAuthUser, serializeUserProfile } from "../lib/serialize-auth.js";
import { applyPresenceHeartbeat, loadTenantPresence } from "../lib/presence.js";
import { isDemoLoginEnabled } from "../lib/employee-self-service.js";
import { fullName } from "../lib/serialize-hr.js";
import { z } from "zod";
import {
  AVATAR_MAX_BYTES,
  decodeBase64Image,
  deleteUserAvatar,
  extensionForMime,
  mimeForExtension,
  resolveStoragePath,
  writeUserAvatar,
} from "../lib/avatar-storage.js";
import { createRateLimiter } from "../lib/rate-limit.js";
import { requireJwtConfigured } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);

function isEmployeeSelfServicePermissions(permissions: string[]): boolean {
  return (
    hasPermission(permissions, HR_SELF_PERMISSIONS.READ) &&
    !hasPermission(permissions, HR_PERMISSIONS.READ) &&
    !hasPermission(permissions, EXECUTIVE_PERMISSIONS.READ)
  );
}

const passwordChangeLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 5,
});

function readErpJwt(req: { headers: { authorization?: string } }): JwtPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const raw = jwt.verify(header.slice(7), assertJwtSecret()) as JwtPayload & { type?: string };
    if (raw.type === "portal" || raw.type === "vendor_portal") return null;
    if (!raw.userId) return null;
    return {
      userId: raw.userId,
      organizationId: raw.organizationId,
      email: raw.email,
      roleCode: raw.roleCode,
      av: typeof raw.av === "number" && raw.av > 0 ? raw.av : 1,
    };
  } catch {
    return null;
  }
}

function requireErpJwt(req: { headers: { authorization?: string } }, res: {
  status: (code: number) => { json: (body: unknown) => void };
}): JwtPayload | null {
  try {
    const parsed = readErpJwt(req);
    if (!parsed) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }
    return parsed;
  } catch (err) {
    if (err instanceof JwtConfigError) {
      res.status(503).json({ error: err.message, code: "JWT_SECRET_MISSING" });
      return null;
    }
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

function serverTiming(marks: Array<[string, number]>): string {
  return marks.map(([name, ms]) => `${name};dur=${ms.toFixed(1)}`).join(", ");
}

function seedSessionFromUser(
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    phone: string | null;
    jobTitle: string | null;
    avatarPath: string | null;
    employeeId: string | null;
    updatedAt: Date;
    isActive: boolean;
    organization: { id: string; name: string; slug: string; isActive: boolean };
    userRoles: Parameters<typeof cacheRolesAndPermissionsFromUserRoles>[1];
  },
  authVersion: number
) {
  const { roles, permissions } = cacheRolesAndPermissionsFromUserRoles(user.id, user.userRoles);
  const primaryRoleCode = roles[0]?.code ?? "viewer";
  const sessionUser = serializeAuthUser(user);
  const sessionOrg = {
    id: user.organization.id,
    name: user.organization.name,
    slug: user.organization.slug,
  };
  const sessionRoles = roles.map((r) => ({ id: r.id, code: r.code, name: r.name }));

  seedAuthzSnapshot({
    userId: user.id,
    organizationId: user.organizationId,
    email: user.email,
    roleCode: primaryRoleCode,
    isActive: user.isActive,
    orgActive: user.organization.isActive,
    permissions,
    authVersion,
    session: {
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
    },
  });

  return { sessionUser, sessionOrg, sessionRoles, permissions, primaryRoleCode };
}

/** Public demo-org metrics for the login showcase (no session required). */
router.get(
  "/login-preview",
  asyncHandler(async (_req, res) => {
    const org =
      (await prisma.organization.findFirst({
        where: { slug: "al-noor-trading", isActive: true },
        select: { id: true, name: true, slug: true },
      })) ??
      (await prisma.organization.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, slug: true },
      }));

    if (!org) {
      res.json({
        organizationName: "Al-Noor Trading Company",
        organizationSlug: "al-noor-trading",
        status: "unavailable",
        metrics: [],
      });
      return;
    }

    const [warehouses, employees, customers, products, branchGroups] = await Promise.all([
      prisma.warehouse.count({ where: { organizationId: org.id, isActive: true } }),
      prisma.employee.count({ where: { organizationId: org.id, isActive: true } }),
      prisma.customer.count({ where: { organizationId: org.id, isActive: true } }),
      prisma.product.count({ where: { organizationId: org.id, isArchived: false } }),
      prisma.warehouse.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { branch: true },
        distinct: ["branch"],
      }),
    ]);

    const metrics = [
      { id: "branches" as const, label: "Branches", value: branchGroups.length },
      { id: "employees" as const, label: "Employees", value: employees },
      { id: "customers" as const, label: "Customers", value: customers },
      { id: "warehouses" as const, label: "Warehouses", value: warehouses },
      { id: "products" as const, label: "Inventory Items", value: products },
    ].filter((m) => m.value > 0);

    res.json({
      organizationName: org.name,
      organizationSlug: org.slug,
      status: "operational",
      metrics,
    });
  })
);

/** Demo-only: list regular employee login accounts (no passwords). */
router.get(
  "/demo-employees",
  asyncHandler(async (req, res) => {
    if (!isDemoLoginEnabled()) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const search =
      typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        employeeId: { not: null },
        email: { endsWith: "@nazzal.demo" },
        employee: {
          isActive: true,
          employmentStatus: { not: "TERMINATED" },
        },
        userRoles: {
          some: { role: { code: "employee" } },
        },
      },
      select: {
        id: true,
        email: true,
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            workLocation: true,
            avatarPath: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
      },
      orderBy: { email: "asc" },
      take: 50,
    });

    const data = users
      .filter((u) => u.employee)
      .map((u) => {
        const emp = u.employee!;
        return {
          userId: u.id,
          email: u.email,
          employeeId: emp.id,
          employeeNumber: emp.employeeNumber,
          fullName: fullName(emp.firstName, emp.lastName),
          department: emp.department.name,
          position: emp.position.title,
          workLocation: emp.workLocation,
          hasAvatar: Boolean(emp.avatarPath),
        };
      })
      .filter((row) => {
        if (!search) return true;
        const hay = [
          row.fullName,
          row.employeeNumber,
          row.department,
          row.position,
          row.workLocation,
          row.email,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });

    res.json({ data });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const t0 = performance.now();
    const marks: Array<[string, number]> = [];
    const mark = (name: string, since: number) => {
      marks.push([name, performance.now() - since]);
    };

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    let t = performance.now();
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email.toLowerCase() },
      include: authSessionInclude,
    });
    mark("db_user", t);

    t = performance.now();
    const passwordOk =
      !!user && (await comparePassword(parsed.data.password, user.passwordHash));
    mark("bcrypt", t);

    if (!user || !passwordOk) {
      res.setHeader("Server-Timing", serverTiming(marks));
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    if (!user.organization.isActive) {
      res.status(403).json({ error: "Organization is inactive" });
      return;
    }

    const authVersion = ensureAuthVersion(user.id);
    const { sessionUser, sessionOrg, sessionRoles, permissions, primaryRoleCode } =
      seedSessionFromUser(user, authVersion);

    t = performance.now();
    let token: string;
    try {
      token = signToken({
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        roleCode: primaryRoleCode,
        av: authVersion,
      });
    } catch (err) {
      if (err instanceof JwtConfigError) {
        res.status(503).json({ error: err.message, code: "JWT_SECRET_MISSING" });
        return;
      }
      throw err;
    }
    mark("jwt", t);

    marks.push(["total", performance.now() - t0]);
    res.setHeader("Server-Timing", serverTiming(marks));
    res.json({
      token,
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });

    // Post-login side effects must not affect the auth response.
    // Keep lastLoginAt separate from optional presence columns so a presence
    // schema/write issue cannot block the core login metadata update.
    void prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch((err) => {
        console.error("[auth] lastLoginAt update failed after login", err);
      });

    void prisma.user
      .update({
        where: { id: user.id },
        data: {
          lastSeenAt: new Date(),
          lastActiveAt: new Date(),
          presenceUpdatedAt: new Date(),
        },
      })
      .catch((err) => {
        console.error("[presence] login presence update failed (non-blocking)", err);
      });

    void prisma.auditLog
      .create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "auth.login",
          entity: "User",
          entityId: user.id,
        },
      })
      .catch((err) => {
        console.error("[auth] login audit log failed (non-blocking)", err);
      });
  })
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const t0 = performance.now();
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const authVersion = payload.av ?? 1;
    const cached = getCachedAuthz(payload.userId, authVersion);
    if (
      cached?.session &&
      cached.isActive &&
      cached.orgActive &&
      cached.organizationId === payload.organizationId
    ) {
      res.setHeader("Server-Timing", `cache;dur=${(performance.now() - t0).toFixed(1)}`);
      res.setHeader("X-Authz-Source", "cache");
      res.json({
        user: cached.session.user,
        organization: cached.session.organization,
        roles: cached.session.roles,
        permissions: cached.permissions,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!user || user.organizationId !== payload.organizationId) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    if (!user.organization.isActive) {
      res.status(403).json({ error: "Organization is inactive" });
      return;
    }

    const version = ensureAuthVersion(user.id);
    const { sessionUser, sessionOrg, sessionRoles, permissions } = seedSessionFromUser(
      user,
      version
    );

    res.setHeader("Server-Timing", `db;dur=${(performance.now() - t0).toFixed(1)}`);
    res.setHeader("X-Authz-Source", "db");
    res.json({
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });
  })
);

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!user || user.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const { roles, permissions } = cacheRolesAndPermissionsFromUserRoles(user.id, user.userRoles);
    res.json(
      serializeUserProfile({
        user,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
        roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
        permissions,
      })
    );
  })
);

router.patch(
  "/profile",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!existing || existing.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const { permissions: currentPermissions } = cacheRolesAndPermissionsFromUserRoles(
      existing.id,
      existing.userRoles
    );
    const employeeSelfService = isEmployeeSelfServicePermissions(currentPermissions);

    // Employees cannot change organizational job title — reject even if the field is sent.
    if (employeeSelfService && Object.prototype.hasOwnProperty.call(req.body ?? {}, "jobTitle")) {
      res.status(403).json({
        error: "Job title is managed by HR and cannot be changed from self-service",
        code: "JOB_TITLE_LOCKED",
      });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          ...(employeeSelfService ? {} : { jobTitle: parsed.data.jobTitle ?? null }),
        },
        include: authSessionInclude,
      });

      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "auth.profile_updated",
          entity: "User",
          entityId: user.id,
          details: {
            summary: "Profile updated",
            fields: employeeSelfService ? ["name", "phone"] : ["name", "phone", "jobTitle"],
          },
        },
      });

      return user;
    });

    const version = ensureAuthVersion(updated.id);
    const { sessionUser, sessionOrg, sessionRoles, permissions } = seedSessionFromUser(
      updated,
      version
    );

    res.json({
      profile: serializeUserProfile({
        user: updated,
        organization: sessionOrg,
        roles: sessionRoles,
        permissions,
      }),
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });
  })
);

const heartbeatSchema = z.object({
  active: z.boolean().optional(),
  offline: z.boolean().optional(),
});

/** Lightweight presence heartbeat — authenticated, tenant-scoped, throttled writes. */
router.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const parsed = heartbeatSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await applyPresenceHeartbeat({
        userId: payload.userId,
        organizationId: payload.organizationId,
        active: parsed.data.active,
        offline: parsed.data.offline,
      });

      if (!result) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        presence: result.presence,
        serverTime: result.serverTime,
        persisted: result.persisted,
      });
    } catch (err) {
      console.error("[presence] heartbeat failed (non-fatal to session)", err);
      // Soft fallback — keep the session usable even if presence storage is unavailable.
      const now = new Date();
      res.json({
        presence: {
          userId: payload.userId,
          status: "offline",
          lastSeenAt: null,
          lastActiveAt: null,
          label: "Offline",
        },
        serverTime: now.toISOString(),
        persisted: false,
        degraded: true,
      });
    }
  })
);

/**
 * Batch presence for coworker avatars / assignee lists.
 * Authenticated + tenant-scoped only — never public.
 */
router.get(
  "/presence",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const raw = typeof req.query.ids === "string" ? req.query.ids : "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

    const data = await loadTenantPresence({
      organizationId: payload.organizationId,
      userIds: ids,
    });

    res.json({ data, serverTime: new Date().toISOString() });
  })
);

router.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, organizationId: true, uiPreferences: true },
    });

    if (!user || user.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Preferences not found" });
      return;
    }

    const preferences = parseStoredUiPreferences(user.uiPreferences);
    res.json({ preferences });
  })
);

router.patch(
  "/preferences",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const parsed = updateUiPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, organizationId: true, uiPreferences: true },
    });

    if (!existing || existing.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Preferences not found" });
      return;
    }

    const current = parseStoredUiPreferences(existing.uiPreferences);
    const next = { ...current };

    if (parsed.data.showPinnedSection !== undefined) {
      next.showPinnedSection = parsed.data.showPinnedSection;
    }

    if (parsed.data.sidebarExpandedGroups !== undefined) {
      next.sidebarExpandedGroups = normalizeExpandedGroups(parsed.data.sidebarExpandedGroups);
    }

    if (parsed.data.notifications !== undefined) {
      next.notifications = {
        inAppEnabled:
          parsed.data.notifications.inAppEnabled === undefined
            ? next.notifications.inAppEnabled
            : parsed.data.notifications.inAppEnabled,
        emailEnabled:
          parsed.data.notifications.emailEnabled === undefined
            ? next.notifications.emailEnabled
            : parsed.data.notifications.emailEnabled,
      };
    }

    if (parsed.data.sidebarPins !== undefined) {
      const knownNormalized = normalizeSidebarPins(parsed.data.sidebarPins);
      const knownIds = new Set(knownNormalized.map((p) => p.id));
      // Preserve unknown IDs for possible future restoration (not exposed as navigable).
      const preservedUnknown = current.sidebarPins.filter(
        (p) => !isKnownNavItemId(p.id) && !knownIds.has(p.id)
      );
      next.sidebarPins = [
        ...knownNormalized,
        ...preservedUnknown.map((p, i) => ({
          ...p,
          order: knownNormalized.length + i,
        })),
      ];
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { uiPreferences: next as object },
      select: { uiPreferences: true },
    });

    res.json({ preferences: parseStoredUiPreferences(updated.uiPreferences) });
  })
);

router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const limited = passwordChangeLimiter.check(payload.userId);
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfterSec));
      res.status(429).json({
        error: "Too many password change attempts. Please try again later.",
        code: "RATE_LIMITED",
      });
      return;
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!user || user.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const currentOk = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentOk) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const nextHash = await hashPassword(parsed.data.newPassword);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: nextHash },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "auth.password_changed",
          entity: "User",
          entityId: user.id,
          details: { summary: "Password changed" },
        },
      });
    });

    // Revoke other sessions; re-issue a token for this client.
    const authVersion = bumpAuthVersion(user.id);
    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      include: authSessionInclude,
    });
    if (!refreshed) {
      res.status(500).json({ error: "Unable to refresh session" });
      return;
    }

    const { sessionUser, sessionOrg, sessionRoles, permissions, primaryRoleCode } =
      seedSessionFromUser(refreshed, authVersion);

    let token: string;
    try {
      token = signToken({
        userId: refreshed.id,
        organizationId: refreshed.organizationId,
        email: refreshed.email,
        roleCode: primaryRoleCode,
        av: authVersion,
      });
    } catch (err) {
      if (err instanceof JwtConfigError) {
        res.status(503).json({ error: err.message, code: "JWT_SECRET_MISSING" });
        return;
      }
      throw err;
    }

    res.json({
      token,
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });
  })
);

router.get(
  "/avatar",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, organizationId: true, avatarPath: true, updatedAt: true },
    });

    if (!user || user.organizationId !== payload.organizationId || !user.avatarPath) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    try {
      const absolute = resolveStoragePath(user.avatarPath);
      const buffer = await fs.readFile(absolute);
      const ext = path.extname(user.avatarPath);
      res.setHeader("Content-Type", mimeForExtension(ext));
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Last-Modified", user.updatedAt.toUTCString());
      res.send(buffer);
    } catch {
      res.status(404).json({ error: "Avatar not found" });
    }
  })
);

/**
 * Tenant-scoped coworker avatar. Authenticated only — never public.
 * Used by assignee selectors, user lists, and person chips.
 */
router.get(
  "/users/:userId/avatar",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    if (!userId) {
      res.status(400).json({ error: "User id required" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: payload.organizationId,
        isActive: true,
      },
      select: { id: true, avatarPath: true, updatedAt: true },
    });

    if (!user?.avatarPath) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    try {
      const absolute = resolveStoragePath(user.avatarPath);
      const buffer = await fs.readFile(absolute);
      const ext = path.extname(user.avatarPath);
      res.setHeader("Content-Type", mimeForExtension(ext));
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Last-Modified", user.updatedAt.toUTCString());
      res.send(buffer);
    } catch {
      res.status(404).json({ error: "Avatar not found" });
    }
  })
);

router.post(
  "/avatar",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const parsed = uploadAvatarSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid avatar upload", details: parsed.error.flatten() });
      return;
    }

    if (!extensionForMime(parsed.data.mimeType)) {
      res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = decodeBase64Image(parsed.data.data);
    } catch {
      res.status(400).json({ error: "Invalid image data" });
      return;
    }

    if (buffer.byteLength > AVATAR_MAX_BYTES) {
      res.status(400).json({ error: "Image must be 2 MB or smaller" });
      return;
    }

    // Basic magic-byte checks
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng =
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (
      (parsed.data.mimeType === "image/jpeg" && !isJpeg) ||
      (parsed.data.mimeType === "image/png" && !isPng) ||
      (parsed.data.mimeType === "image/webp" && !isWebp)
    ) {
      res.status(400).json({ error: "Image content does not match the declared type" });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!existing || existing.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    let relativePath: string;
    try {
      relativePath = await writeUserAvatar({
        organizationId: existing.organizationId,
        userId: existing.id,
        mimeType: parsed.data.mimeType,
        buffer,
        previousPath: existing.avatarPath,
      });
    } catch {
      res.status(400).json({ error: "Unable to save avatar" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: existing.id },
        data: { avatarPath: relativePath },
        include: authSessionInclude,
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "auth.avatar_updated",
          entity: "User",
          entityId: user.id,
          details: { summary: "Avatar updated" },
        },
      });
      return user;
    });

    const version = ensureAuthVersion(updated.id);
    const { sessionUser, sessionOrg, sessionRoles, permissions } = seedSessionFromUser(
      updated,
      version
    );

    res.json({
      profile: serializeUserProfile({
        user: updated,
        organization: sessionOrg,
        roles: sessionRoles,
        permissions,
      }),
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });
  })
);

router.delete(
  "/avatar",
  asyncHandler(async (req, res) => {
    const payload = requireErpJwt(req, res);
    if (!payload) return;

    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: authSessionInclude,
    });

    if (!existing || existing.organizationId !== payload.organizationId) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    await deleteUserAvatar(existing.avatarPath);

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: existing.id },
        data: { avatarPath: null },
        include: authSessionInclude,
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "auth.avatar_removed",
          entity: "User",
          entityId: user.id,
          details: { summary: "Avatar removed" },
        },
      });
      return user;
    });

    const version = ensureAuthVersion(updated.id);
    const { sessionUser, sessionOrg, sessionRoles, permissions } = seedSessionFromUser(
      updated,
      version
    );

    res.json({
      profile: serializeUserProfile({
        user: updated,
        organization: sessionOrg,
        roles: sessionRoles,
        permissions,
      }),
      user: sessionUser,
      organization: sessionOrg,
      roles: sessionRoles,
      permissions,
    });
  })
);

export default router;
