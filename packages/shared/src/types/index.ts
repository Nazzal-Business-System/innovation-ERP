export type HealthStatus = "ok" | "degraded" | "error";

export type DatabaseStatus = "connected" | "disconnected" | "not_configured";

export interface ApiHealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  database?: DatabaseStatus;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  phone?: string | null;
  jobTitle?: string | null;
  /** Linked HR Employee id when this user has self-service access. */
  employeeId?: string | null;
  /** True when an avatar file exists; load via authenticated GET /auth/avatar. */
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  /** Presence timestamps (server time). Clients derive Online/Away/Offline — never hardcode. */
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  presenceUpdatedAt?: string | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface AuthRole {
  id: string;
  code: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

export interface MeResponse {
  user: AuthUser;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  jobTitle: string | null;
  hasAvatar: boolean;
  avatarUpdatedAt: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  presenceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

export interface UpdateProfileInput {
  name: string;
  phone?: string | null;
  jobTitle?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  token: string;
  user: AuthUser;
  organization: AuthOrganization;
  roles: AuthRole[];
  permissions: string[];
}

export interface UploadAvatarInput {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
}

export type PermissionKey = `${string}.${string}`;

export * from "./dashboard";
export * from "./master-data";
export * from "./inventory";
export * from "./procurement";
export * from "./sales";
export * from "./accounting";
export * from "./reports";
export * from "./hr";
export * from "./settings";
export * from "./notifications";
export * from "./operations";
export * from "./finance";
export * from "./crm";
export * from "./projects";
export * from "./support";
export * from "./documents";
export * from "./search";
export * from "./knowledge";
export * from "./ui-preferences";
export * from "./login-preview";
