import { prisma } from "./prisma.js";

const PERMISSION_CACHE_TTL_MS = 60_000;

type RoleRecord = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CachedPermissions = {
  permissions: string[];
  roles: RoleRecord[];
  expiresAt: number;
};

const permissionCache = new Map<string, CachedPermissions>();

function rolesAndPermissionsFromUserRoles(
  userRoles: Array<{
    role: RoleRecord & {
      rolePermissions: Array<{
        permission: { section: string; action: string };
      }>;
    };
  }>
): { roles: RoleRecord[]; permissions: string[] } {
  const keys = new Set<string>();
  const roles: RoleRecord[] = [];

  for (const userRole of userRoles) {
    const { rolePermissions, ...role } = userRole.role;
    roles.push(role);
    for (const rp of rolePermissions) {
      keys.add(`${rp.permission.section}.${rp.permission.action}`);
    }
  }

  return { roles, permissions: Array.from(keys).sort() };
}

function writeCache(userId: string, roles: RoleRecord[], permissions: string[]): CachedPermissions {
  const entry: CachedPermissions = {
    roles,
    permissions,
    expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS,
  };
  permissionCache.set(userId, entry);
  return entry;
}

async function loadRolesAndPermissions(userId: string): Promise<{
  roles: RoleRecord[];
  permissions: string[];
}> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            where: { granted: true },
            include: { permission: true },
          },
        },
      },
    },
  });

  return rolesAndPermissionsFromUserRoles(userRoles);
}

function readCache(userId: string): CachedPermissions | null {
  const cached = permissionCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    permissionCache.delete(userId);
    return null;
  }
  return cached;
}

async function getCachedSession(userId: string): Promise<CachedPermissions> {
  const hit = readCache(userId);
  if (hit) return hit;

  const loaded = await loadRolesAndPermissions(userId);
  return writeCache(userId, loaded.roles, loaded.permissions);
}

export function invalidateUserPermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

export function invalidateAllPermissionCaches(): void {
  permissionCache.clear();
}

/** Seed cache from an already-loaded userRoles include tree. */
export function cacheRolesAndPermissionsFromUserRoles(
  userId: string,
  userRoles: Array<{
    role: RoleRecord & {
      rolePermissions: Array<{
        permission: { section: string; action: string };
      }>;
    };
  }>
): { roles: RoleRecord[]; permissions: string[] } {
  const loaded = rolesAndPermissionsFromUserRoles(userRoles);
  writeCache(userId, loaded.roles, loaded.permissions);
  return loaded;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const session = await getCachedSession(userId);
  return session.permissions;
}

export async function getUserRoles(userId: string) {
  const session = await getCachedSession(userId);
  return session.roles;
}

export async function getUserRolesAndPermissions(userId: string) {
  return getCachedSession(userId);
}

export async function getPrimaryRoleCode(userId: string): Promise<string | null> {
  const roles = await getUserRoles(userId);
  return roles[0]?.code ?? null;
}

/** Lean RBAC tree — only fields needed for session + permission keys. */
export const authSessionInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  userRoles: {
    include: {
      role: {
        select: {
          id: true,
          organizationId: true,
          name: true,
          code: true,
          description: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
          rolePermissions: {
            where: { granted: true as const },
            select: {
              permission: {
                select: { section: true, action: true },
              },
            },
          },
        },
      },
    },
  },
} as const;
