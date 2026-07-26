/**
 * Returns true when the user has at least one of the required permission keys.
 */
export function hasPermission(permissions: string[], ...required: string[]): boolean {
  if (required.length === 0) return true;
  return required.some((key) => permissions.includes(key));
}
