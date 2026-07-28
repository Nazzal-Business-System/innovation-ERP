import { isEmployeeSelfServiceUser } from "@ierp/shared";

export { isEmployeeSelfServiceUser };

/** Home route after login / session restore. */
export function resolveHomeRoute(permissions: string[]): string {
  return isEmployeeSelfServiceUser(permissions) ? "/dashboard/my-workspace" : "/dashboard";
}

/**
 * Honor an intended post-login path only when the user is allowed to open it.
 * Regular employees never land on inaccessible management pages.
 * Managers/admins are redirected away from My Workspace (employee-only).
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

  // Management users: My Workspace is employee-only — bounce to home.
  if (intended.startsWith("/dashboard/my-workspace")) {
    return home;
  }

  if (intended.startsWith("/dashboard") || intended.startsWith("/login")) {
    return intended.startsWith("/login") ? home : intended;
  }

  return home;
}
