"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { useAuthStore } from "@/lib/auth-store";

export function SidebarUserSummary({ showPresence = false }: { showPresence?: boolean }) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex cursor-pointer items-center gap-2.5">
      <UserAvatar size="sm" className="shrink-0" showPresence={showPresence} />
      <div className="hidden text-start md:block">
        <p className="text-sm font-medium leading-none text-[var(--foreground)]">{user?.name}</p>
        <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-[var(--muted-foreground)]">
          {user?.email}
        </p>
      </div>
    </div>
  );
}
