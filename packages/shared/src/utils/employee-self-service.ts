import { hasPermission } from "./permissions";

/** Keep string literals so Node strip-types tests can load this without package exports. */
const HR_SELF_READ = "hr_self.read";
const HR_READ = "hr.read";
const EXECUTIVE_READ = "executive.read";

/**
 * Canonical rule: My Workspace / employee self-service is for regular
 * employee accounts only — hr_self without management HR or executive access.
 *
 * CEO/Owner and managers who also hold hr_self (e.g. owner grant-all) must
 * NOT see or use the self-service panel as their employee surface.
 */
export function isEmployeeSelfServiceUser(permissions: string[]): boolean {
  return (
    hasPermission(permissions, HR_SELF_READ) &&
    !hasPermission(permissions, HR_READ) &&
    !hasPermission(permissions, EXECUTIVE_READ)
  );
}
