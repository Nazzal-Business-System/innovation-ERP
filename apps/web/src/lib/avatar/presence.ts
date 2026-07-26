import type { PersonAvatarPresence } from "@/components/avatar/person-avatar";

/**
 * Canonical presence rule for person surfaces (tenant-scoped real presence).
 *
 * - linked user → Online / Away / Offline (never hide Offline)
 * - no linked user account → no presence dot (callers may show "No account")
 * - loading / unknown → neutral placeholder without flicker
 */
export function resolveLinkedUserPresence(input: {
  /** Linked User.id — required for any presence indicator. */
  accountUserId?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  /** While presence payload is still loading for a known linked account. */
  loading?: boolean;
}): PersonAvatarPresence {
  if (!input.accountUserId) return false;
  if (input.loading) return { status: "unknown" };
  return {
    lastSeenAt: input.lastSeenAt,
    lastActiveAt: input.lastActiveAt,
  };
}

export function hasLinkedUserAccount(accountUserId?: string | null): boolean {
  return Boolean(accountUserId);
}
