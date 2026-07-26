/** Permission module display order for Roles & Permissions UI */
export const PERMISSION_SECTION_ORDER = [
  "executive",
  "inventory",
  "procurement",
  "sales",
  "operations",
  "finance",
  "accounting",
  "hr",
  "crm",
  "projects",
  "support",
  "documents",
  "knowledge",
  "reports",
  "settings",
  "users",
  "roles",
  "notifications",
  "audit_log",
] as const;

export type PermissionSectionId = (typeof PERMISSION_SECTION_ORDER)[number];
