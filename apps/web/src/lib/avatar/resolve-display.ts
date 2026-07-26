/**
 * Display-resolution order for profile images.
 *
 * Employee / HR / self-service surfaces:
 *   1. Employee photo (Employee.avatarPath)
 *   2. Linked user account avatar (User.avatarPath) — optional fallback when explicitly requested
 *   3. Initials
 *
 * Account / shell / settings surfaces:
 *   1. User account avatar (User.avatarPath)
 *   2. Linked employee photo — optional fallback when explicitly requested
 *   3. Initials
 *
 * Uploading one store never silently overwrites the other.
 * Presence: only when a linked User account exists (Online / Away / Offline).
 * Employees without a login account never show Offline — use “No account” instead.
 */

export type AvatarImageSource =
  | { kind: "user"; userId: string; hasAvatar: boolean; avatarUpdatedAt?: string | null }
  | { kind: "employee"; employeeId: string; hasAvatar: boolean; avatarUpdatedAt?: string | null }
  | { kind: "self-employee"; hasAvatar: boolean; avatarUpdatedAt?: string | null }
  | { kind: "self-user"; hasAvatar: boolean; avatarUpdatedAt?: string | null }
  | { kind: "none" };

export function resolveEmployeeDisplaySource(input: {
  employeeId: string;
  hasEmployeeAvatar: boolean;
  employeeAvatarUpdatedAt?: string | null;
  /** When true and employee has no photo, fall back to linked user avatar. */
  allowUserFallback?: boolean;
  linkedUserId?: string | null;
  hasUserAvatar?: boolean;
  userAvatarUpdatedAt?: string | null;
}): AvatarImageSource {
  if (input.hasEmployeeAvatar) {
    return {
      kind: "employee",
      employeeId: input.employeeId,
      hasAvatar: true,
      avatarUpdatedAt: input.employeeAvatarUpdatedAt,
    };
  }
  if (
    input.allowUserFallback &&
    input.linkedUserId &&
    input.hasUserAvatar
  ) {
    return {
      kind: "user",
      userId: input.linkedUserId,
      hasAvatar: true,
      avatarUpdatedAt: input.userAvatarUpdatedAt,
    };
  }
  return { kind: "none" };
}

export function resolveAccountDisplaySource(input: {
  userId: string;
  hasUserAvatar: boolean;
  userAvatarUpdatedAt?: string | null;
  /** When true and user has no photo, fall back to linked employee photo. */
  allowEmployeeFallback?: boolean;
  linkedEmployeeId?: string | null;
  hasEmployeeAvatar?: boolean;
  employeeAvatarUpdatedAt?: string | null;
}): AvatarImageSource {
  if (input.hasUserAvatar) {
    return {
      kind: "user",
      userId: input.userId,
      hasAvatar: true,
      avatarUpdatedAt: input.userAvatarUpdatedAt,
    };
  }
  if (
    input.allowEmployeeFallback &&
    input.linkedEmployeeId &&
    input.hasEmployeeAvatar
  ) {
    return {
      kind: "employee",
      employeeId: input.linkedEmployeeId,
      hasAvatar: true,
      avatarUpdatedAt: input.employeeAvatarUpdatedAt,
    };
  }
  return { kind: "none" };
}
