"use client";

import { PersonAvatar, PersonAvatarLabel } from "@/components/avatar/person-avatar";
import { resolveLinkedUserPresence } from "@/lib/avatar/presence";

/** Compact user chip for assignee / owner columns. */
export function UserPersonChip({
  user,
  empty = "—",
}: {
  user?: {
    id: string;
    name: string;
    hasAvatar?: boolean;
    avatarUpdatedAt?: string | null;
    lastSeenAt?: string | null;
    lastActiveAt?: string | null;
  } | null;
  empty?: string;
}) {
  if (!user) return <span className="text-sm text-[var(--muted)]">{empty}</span>;
  return (
    <PersonAvatarLabel
      name={user.name}
      avatar={
        <PersonAvatar
          name={user.name}
          source={{
            kind: "user",
            userId: user.id,
            hasAvatar: Boolean(user.hasAvatar),
            avatarUpdatedAt: user.avatarUpdatedAt,
          }}
          size="xs"
          presence={resolveLinkedUserPresence({
            accountUserId: user.id,
            lastSeenAt: user.lastSeenAt,
            lastActiveAt: user.lastActiveAt,
          })}
          lazy
        />
      }
    />
  );
}

/** Compact employee chip for HR table rows. */
export function EmployeePersonChip({
  employee,
  showPresence = true,
}: {
  employee: {
    id: string;
    fullName: string;
    employeeNumber?: string;
    hasAvatar?: boolean;
    avatarUpdatedAt?: string | null;
    accountUserId?: string | null;
    lastSeenAt?: string | null;
    lastActiveAt?: string | null;
  };
  showPresence?: boolean;
}) {
  const linked = Boolean(employee.accountUserId);
  return (
    <PersonAvatarLabel
      name={employee.fullName}
      subtitle={
        employee.employeeNumber ? (
          <span className="ew-ltr-isolate font-mono">{employee.employeeNumber}</span>
        ) : null
      }
      avatar={
        <PersonAvatar
          name={employee.fullName}
          source={{
            kind: "employee",
            employeeId: employee.id,
            hasAvatar: Boolean(employee.hasAvatar),
            avatarUpdatedAt: employee.avatarUpdatedAt,
          }}
          size="sm"
          presence={
            showPresence
              ? resolveLinkedUserPresence({
                  accountUserId: employee.accountUserId,
                  lastSeenAt: employee.lastSeenAt,
                  lastActiveAt: employee.lastActiveAt,
                })
              : false
          }
          noAccount={showPresence && !linked}
          lazy
          ring={false}
        />
      }
    />
  );
}
