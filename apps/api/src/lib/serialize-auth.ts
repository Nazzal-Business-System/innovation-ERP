import type { AuthUser, UserProfile } from "@ierp/shared";

type UserRow = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  phone?: string | null;
  jobTitle?: string | null;
  avatarPath?: string | null;
  employeeId?: string | null;
  updatedAt: Date;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  lastSeenAt?: Date | null;
  lastActiveAt?: Date | null;
  presenceUpdatedAt?: Date | null;
  createdAt?: Date;
};

export function serializeAuthUser(user: UserRow & { employeeId?: string | null }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    employeeId: user.employeeId ?? null,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath ? user.updatedAt.toISOString() : null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    presenceUpdatedAt: user.presenceUpdatedAt?.toISOString() ?? null,
  };
}

export function serializeUserProfile(input: {
  user: UserRow & {
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  organization: { id: string; name: string; slug: string };
  roles: Array<{ id: string; code: string; name: string }>;
  permissions: string[];
}): UserProfile {
  const { user } = input;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    hasAvatar: Boolean(user.avatarPath),
    avatarUpdatedAt: user.avatarPath ? user.updatedAt.toISOString() : null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    presenceUpdatedAt: user.presenceUpdatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    organization: input.organization,
    roles: input.roles,
    permissions: input.permissions,
  };
}
