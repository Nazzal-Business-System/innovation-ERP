import {
  ACCOUNTING_PERMISSIONS,
  CRM_PERMISSIONS,
  DOCUMENTS_PERMISSIONS,
  EXECUTIVE_PERMISSIONS,
  FINANCE_PERMISSIONS,
  HR_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  KNOWLEDGE_PERMISSIONS,
  NOTIFICATIONS_PERMISSIONS,
  OPERATIONS_PERMISSIONS,
  PROCUREMENT_PERMISSIONS,
  PROJECTS_PERMISSIONS,
  REPORTS_PERMISSIONS,
  SALES_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  SUPPORT_PERMISSIONS,
  hasPermission,
  isEmployeeSelfServiceUser,
} from "@ierp/shared";

const AUDIT_LOG_READ = "audit_log.read";

/**
 * Sidebar / search / pin visibility.
 * My Workspace (`my-*`) is employee self-service only — see `isEmployeeSelfServiceUser`.
 */
export function canAccessNavItem(itemId: string, permissions: string[]): boolean {
  if (itemId.startsWith("my-")) {
    return isEmployeeSelfServiceUser(permissions);
  }
  if (itemId === "dashboard") {
    return hasPermission(permissions, EXECUTIVE_PERMISSIONS.READ);
  }
  if (itemId === "notifications") {
    // Employees use My Workspace → Notifications instead of the executive inbox.
    if (isEmployeeSelfServiceUser(permissions)) {
      return false;
    }
    return hasPermission(permissions, NOTIFICATIONS_PERMISSIONS.READ);
  }
  if (itemId.startsWith("accounting-")) {
    return hasPermission(permissions, ACCOUNTING_PERMISSIONS.READ);
  }
  if (itemId.startsWith("finance-")) {
    return hasPermission(
      permissions,
      FINANCE_PERMISSIONS.READ,
      ACCOUNTING_PERMISSIONS.READ
    );
  }
  if (itemId.startsWith("inventory-")) {
    return hasPermission(permissions, INVENTORY_PERMISSIONS.READ);
  }
  if (itemId.startsWith("procurement-")) {
    return hasPermission(permissions, PROCUREMENT_PERMISSIONS.READ);
  }
  if (itemId.startsWith("operations-")) {
    return hasPermission(
      permissions,
      OPERATIONS_PERMISSIONS.READ,
      PROCUREMENT_PERMISSIONS.READ,
      SALES_PERMISSIONS.READ
    );
  }
  if (itemId.startsWith("sales-")) {
    return hasPermission(permissions, SALES_PERMISSIONS.READ);
  }
  if (itemId.startsWith("crm-")) {
    return hasPermission(permissions, CRM_PERMISSIONS.READ);
  }
  if (itemId.startsWith("projects-")) {
    return hasPermission(permissions, PROJECTS_PERMISSIONS.READ);
  }
  if (itemId.startsWith("support-")) {
    return hasPermission(permissions, SUPPORT_PERMISSIONS.READ);
  }
  if (itemId.startsWith("documents-")) {
    return hasPermission(permissions, DOCUMENTS_PERMISSIONS.READ);
  }
  if (itemId.startsWith("knowledge-")) {
    return hasPermission(permissions, KNOWLEDGE_PERMISSIONS.READ);
  }
  if (itemId.startsWith("hr-")) {
    return hasPermission(permissions, HR_PERMISSIONS.READ);
  }
  if (itemId.startsWith("reports-")) {
    return hasPermission(permissions, REPORTS_PERMISSIONS.READ);
  }

  return true;
}

export function canAccessSettings(permissions: string[]): boolean {
  return hasPermission(permissions, SETTINGS_PERMISSIONS.READ);
}

export { AUDIT_LOG_READ };
