"use client";

import { PersonAvatar, type PersonAvatarPresence } from "@/components/avatar/person-avatar";
import type { AvatarSize } from "@/lib/avatar/sizes";

/**
 * HR employee photo (Employee.avatarPath).
 * Presence only when a linked account is provided.
 */
export function EmployeeAvatar({
  employeeId,
  fullName,
  hasAvatar,
  avatarUpdatedAt,
  className,
  fallbackClassName,
  size = "lg",
  presence,
  lazy = true,
  ring = true,
}: {
  employeeId: string;
  fullName: string;
  hasAvatar: boolean;
  avatarUpdatedAt?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: AvatarSize | "profile";
  presence?: PersonAvatarPresence;
  lazy?: boolean;
  ring?: boolean;
}) {
  const resolvedSize: AvatarSize = size === "profile" ? "xl" : size;

  return (
    <PersonAvatar
      name={fullName}
      source={{
        kind: "employee",
        employeeId,
        hasAvatar,
        avatarUpdatedAt,
      }}
      size={resolvedSize}
      presence={presence}
      className={className}
      fallbackClassName={fallbackClassName}
      lazy={lazy}
      ring={ring}
    />
  );
}
