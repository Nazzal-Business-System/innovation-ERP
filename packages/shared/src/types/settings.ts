export interface SettingsOrganization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsBranch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  isActive: boolean;
}

export interface SettingsUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  organization: { id: string; name: string };
  roles: Array<{ id: string; code: string; name: string }>;
  lastLoginAt: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  createdAt: string;
}

export interface SettingsRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  permissions: Array<{ id: string; key: string; description: string | null }>;
}

export interface SettingsPermission {
  id: string;
  key: string;
  section: string;
  action: string;
  description: string | null;
}

export interface SettingsPreference {
  id: string;
  key: string;
  value: string;
  category: string;
}

export interface SettingsAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface SettingsOverview {
  organization: SettingsOrganization;
  branchCount: number;
  userCount: number;
  roleCount: number;
  permissionCount: number;
  preferenceCount: number;
  recentAuditLogs: SettingsAuditLog[];
}

export const SETTINGS_PERMISSIONS = {
  READ: "settings.read",
  WRITE: "settings.write",
} as const;

export const USERS_PERMISSIONS = {
  READ: "users.read",
  WRITE: "users.write",
} as const;

export const ROLES_PERMISSIONS = {
  READ: "roles.read",
  WRITE: "roles.write",
} as const;

export const EXECUTIVE_PERMISSIONS = {
  READ: "executive.read",
  WRITE: "executive.write",
} as const;

export interface UpdateRolePermissionsRequest {
  permissions: Array<{ permissionId: string; granted: boolean }>;
}

export interface UpdateRolePermissionsResponse {
  role: SettingsRole;
}

export const AUDIT_PERMISSIONS = {
  READ: "audit_log.read",
} as const;
