import { prisma } from "./prisma.js";
import {
  authSessionInclude,
  cacheRolesAndPermissionsFromUserRoles,
  invalidateAllPermissionCaches,
  invalidateUserPermissionCache,
} from "./permissions.js";
import { serializeAuthUser } from "./serialize-auth.js";

const AUTHZ_TTL_MS = 60_000;

export type AuthSessionProfile = {
  user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    phone?: string | null;
    jobTitle?: string | null;
    hasAvatar?: boolean;
    avatarUpdatedAt?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

export type AuthzSnapshot = {
  userId: string;
  organizationId: string;
  email: string;
  roleCode: string;
  isActive: boolean;
  orgActive: boolean;
  permissions: string[];
  authVersion: number;
  expiresAt: number;
  /** Lean /auth/me payload — avoids DB when cache is warm. */
  session?: AuthSessionProfile;
};

/** Monotonic per-user auth version; bump to revoke older JWTs after privilege changes. */
const authVersions = new Map<string, number>();
const authzCache = new Map<string, AuthzSnapshot>();

export function getAuthVersion(userId: string): number {
  return authVersions.get(userId) ?? 1;
}

export function ensureAuthVersion(userId: string): number {
  const current = authVersions.get(userId);
  if (current != null) return current;
  authVersions.set(userId, 1);
  return 1;
}

export function bumpAuthVersion(userId: string): number {
  const next = getAuthVersion(userId) + 1;
  authVersions.set(userId, next);
  authzCache.delete(userId);
  for (const key of [...authzCache.keys()]) {
    if (key.startsWith(`${userId}:`)) authzCache.delete(key);
  }
  invalidateUserPermissionCache(userId);
  return next;
}

export function bumpAllAuthVersions(): void {
  for (const userId of authVersions.keys()) {
    authVersions.set(userId, getAuthVersion(userId) + 1);
  }
  authzCache.clear();
  invalidateAllPermissionCaches();
}

export function invalidateAuthzCache(userId?: string): void {
  if (userId) {
    for (const key of [...authzCache.keys()]) {
      if (key === userId || key.startsWith(`${userId}:`)) authzCache.delete(key);
    }
    invalidateUserPermissionCache(userId);
    return;
  }
  authzCache.clear();
  invalidateAllPermissionCaches();
}

function cacheKey(userId: string, authVersion: number): string {
  return `${userId}:${authVersion}`;
}

export function seedAuthzSnapshot(
  snapshot: Omit<AuthzSnapshot, "expiresAt">
): AuthzSnapshot {
  authVersions.set(snapshot.userId, snapshot.authVersion);
  const entry: AuthzSnapshot = {
    ...snapshot,
    expiresAt: Date.now() + AUTHZ_TTL_MS,
  };
  authzCache.set(cacheKey(snapshot.userId, snapshot.authVersion), entry);
  return entry;
}

export function getCachedAuthz(userId: string, authVersion: number): AuthzSnapshot | null {
  const entry = authzCache.get(cacheKey(userId, authVersion));
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    authzCache.delete(cacheKey(userId, authVersion));
    return null;
  }
  return entry;
}

/**
 * Load authoritative authz from DB and seed caches.
 * Returns null when user/org is missing or inactive.
 */
export async function loadAuthzSnapshot(input: {
  userId: string;
  organizationId: string;
  authVersion: number;
}): Promise<AuthzSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: authSessionInclude,
  });

  if (!user || user.organizationId !== input.organizationId) {
    return null;
  }

  if (!user.isActive || !user.organization.isActive) {
    return null;
  }

  const { roles, permissions } = cacheRolesAndPermissionsFromUserRoles(user.id, user.userRoles);
  const roleCode = roles[0]?.code ?? "viewer";

  return seedAuthzSnapshot({
    userId: user.id,
    organizationId: user.organizationId,
    email: user.email,
    roleCode,
    isActive: user.isActive,
    orgActive: user.organization.isActive,
    permissions,
    authVersion: input.authVersion,
    session: {
      user: serializeAuthUser(user),
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
      roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    },
  });
}

/** After role permission matrix edits, revoke all in-memory sessions for the org's users. */
export async function revokeAuthzForOrganization(organizationId: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });
  for (const user of users) {
    bumpAuthVersion(user.id);
  }
  if (users.length === 0) {
    bumpAllAuthVersions();
  }
}
