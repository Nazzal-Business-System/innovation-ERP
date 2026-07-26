"use client";

import { PersonAvatar } from "@/components/avatar/person-avatar";
import type { AvatarSize } from "@/lib/avatar/sizes";

/** Self-service employee photo via /self-service/me/avatar. */
export function SelfServiceAvatar({
  fullName,
  hasAvatar,
  avatarUpdatedAt,
  className,
  size = "lg",
  lazy = false,
}: {
  fullName: string;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  className?: string;
  size?: AvatarSize;
  lazy?: boolean;
}) {
  return (
    <PersonAvatar
      name={fullName}
      source={{
        kind: "self-employee",
        hasAvatar: Boolean(hasAvatar),
        avatarUpdatedAt,
      }}
      size={size}
      className={className}
      lazy={lazy}
    />
  );
}
