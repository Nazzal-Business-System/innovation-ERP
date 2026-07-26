"use client";

import { PersonAvatar, type PersonAvatarPresence } from "@/components/avatar/person-avatar";
import { useAuthStore } from "@/lib/auth-store";
import type { AvatarSize } from "@/lib/avatar/sizes";

/**
 * Current authenticated account avatar (User.avatarPath).
 * Thin wrapper over PersonAvatar for shell chrome.
 */
export function UserAvatar({
  className,
  fallbackClassName,
  size = "md",
  showPresence = false,
  presenceClassName: _presenceClassName,
  lazy = false,
}: {
  className?: string;
  fallbackClassName?: string;
  size?: AvatarSize;
  showPresence?: boolean;
  /** @deprecated Presence is always bottom-end; kept for call-site compatibility. */
  presenceClassName?: string;
  lazy?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  void _presenceClassName;

  const presence: PersonAvatarPresence = showPresence
    ? {
        lastSeenAt: user?.lastSeenAt,
        lastActiveAt: user?.lastActiveAt,
      }
    : false;

  return (
    <PersonAvatar
      name={user?.name ?? "?"}
      source={{
        kind: "self-user",
        hasAvatar: Boolean(user?.hasAvatar),
        avatarUpdatedAt: user?.avatarUpdatedAt,
      }}
      size={size}
      presence={presence}
      className={className}
      fallbackClassName={fallbackClassName}
      lazy={lazy}
    />
  );
}
