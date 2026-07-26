import { EXECUTIVE_PERMISSIONS, HR_PERMISSIONS, HR_SELF_PERMISSIONS, hasPermission } from "@ierp/shared";

/** Home route after login / session restore. */
export function resolveHomeRoute(permissions: string[]): string {
  return isEmployeeSelfServiceUser(permissions) ? "/dashboard/my-workspace" : "/dashboard";
}

export function isEmployeeSelfServiceUser(permissions: string[]): boolean {
  return (
    hasPermission(permissions, HR_SELF_PERMISSIONS.READ) &&
    !hasPermission(permissions, HR_PERMISSIONS.READ) &&
    !hasPermission(permissions, EXECUTIVE_PERMISSIONS.READ)
  );
}

/**
 * Honor an intended post-login path only when the user is allowed to open it.
 * Regular employees never land on inaccessible management pages.
 */
export function resolveAuthorizedRedirect(
  permissions: string[],
  intended: string | null | undefined
): string {
  const home = resolveHomeRoute(permissions);
  if (!intended || !intended.startsWith("/")) return home;
  if (intended.startsWith("//") || intended.includes("://")) return home;

  if (isEmployeeSelfServiceUser(permissions)) {
    const allowed =
      intended.startsWith("/dashboard/my-workspace") ||
      intended === "/dashboard/profile" ||
      intended.startsWith("/dashboard/notifications") ||
      intended.startsWith("/dashboard/settings/appearance") ||
      intended.startsWith("/dashboard/settings/language") ||
      intended.startsWith("/dashboard/settings/notifications");
    return allowed ? intended : home;
  }

  if (intended.startsWith("/dashboard") || intended.startsWith("/login")) {
    return intended.startsWith("/login") ? home : intended;
  }

  return home;
}
