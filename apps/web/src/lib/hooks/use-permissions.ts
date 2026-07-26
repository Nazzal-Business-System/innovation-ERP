"use client";

import { hasPermission } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);

  return {
    permissions,
    has: (...required: string[]) => hasPermission(permissions, ...required),
  };
}
