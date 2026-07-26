import type { AuditLog, Branch, Organization, Permission, Role, SystemPreference, User } from "@prisma/client";

type RoleWithPermissions = Role & {
  rolePermissions: Array<{ permission: Permission; granted: boolean }>;
};

type UserWithRoles = User & {
  organization: Organization;
  userRoles: Array<{ role: Role }>;
};

type AuditLogWithUser = AuditLog & {
  user: User | null;
};

export function serializeSettingsOrganization(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    industry: org.industry,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    isActive: org.isActive,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export function serializeBranch(branch: Branch) {
  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    city: branch.city,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.isActive,
  };
}

export function serializeSettingsUser(user: UserWithRoles) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    organization: { id: user.organization.id, name: user.organization.name },
    roles: user.userRoles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
    })),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath ? user.updatedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeSettingsRole(role: RoleWithPermissions) {
  const permissions = role.rolePermissions
    .filter((rp) => rp.granted)
    .map((rp) => ({
      id: rp.permission.id,
      key: `${rp.permission.section}.${rp.permission.action}`,
      description: rp.permission.description,
    }));

  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionCount: permissions.length,
    permissions,
  };
}

export function serializePermission(permission: Permission) {
  return {
    id: permission.id,
    key: `${permission.section}.${permission.action}`,
    section: permission.section,
    action: permission.action,
    description: permission.description,
  };
}

export function serializePreference(pref: SystemPreference) {
  return {
    id: pref.id,
    key: pref.key,
    value: pref.value,
    category: pref.category,
  };
}

export function serializeAuditLog(log: AuditLogWithUser) {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    details: log.details as Record<string, unknown> | null,
    user: log.user
      ? { id: log.user.id, name: log.user.name, email: log.user.email }
      : null,
    createdAt: log.createdAt.toISOString(),
  };
}
