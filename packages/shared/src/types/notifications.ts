import type { PaginatedResponse } from "./inventory";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type NotificationModule =
  | "SYSTEM"
  | "INVENTORY"
  | "PROCUREMENT"
  | "SALES"
  | "ACCOUNTING"
  | "HR"
  | "REPORTS"
  | "PROJECTS"
  | "SUPPORT"
  | "DOCUMENTS"
  | "KNOWLEDGE";

export interface Notification {
  id: string;
  type: NotificationType;
  module: NotificationModule;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsOverview {
  unreadCount: number;
  recent: Notification[];
}

export type NotificationsListResponse = PaginatedResponse<Notification>;

export const NOTIFICATIONS_PERMISSIONS = {
  READ: "notifications.read",
} as const;

export function notificationModuleLink(module: NotificationModule, entityType?: string | null, entityId?: string | null): string | null {
  if (!entityId) {
    const overview: Record<NotificationModule, string> = {
      SYSTEM: "/dashboard/notifications",
      INVENTORY: "/dashboard/inventory",
      PROCUREMENT: "/dashboard/procurement",
      SALES: "/dashboard/sales",
      ACCOUNTING: "/dashboard/accounting",
      HR: "/dashboard/hr",
      REPORTS: "/dashboard/reports",
      PROJECTS: "/dashboard/projects",
      SUPPORT: "/dashboard/support",
      DOCUMENTS: "/dashboard/documents",
      KNOWLEDGE: "/dashboard/knowledge",
    };
    return overview[module];
  }

  const routes: Record<string, string> = {
    product: `/dashboard/inventory/products/${entityId}`,
    stock_reservation: `/dashboard/inventory/reservations/${entityId}`,
    warehouse_transfer: `/dashboard/inventory/transfers/${entityId}`,
    purchase_order: `/dashboard/procurement/purchase-orders/${entityId}`,
    goods_receipt: `/dashboard/operations/goods-receipts/${entityId}`,
    sales_order: `/dashboard/sales/orders/${entityId}`,
    delivery: `/dashboard/operations/deliveries/${entityId}`,
    journal_entry: `/dashboard/accounting/journal-entries/${entityId}`,
    leave_request: `/dashboard/hr/leave-requests/${entityId}`,
    report: "/dashboard/reports",
    project: `/dashboard/projects/${entityId}`,
    project_task: `/dashboard/projects/tasks/${entityId}`,
    project_milestone: "/dashboard/projects/milestones",
    support_ticket: `/dashboard/support/tickets/${entityId}`,
    document_file: `/dashboard/documents/files/${entityId}`,
    knowledge_article: `/dashboard/knowledge/articles/${entityId}`,
  };

  if (entityType && routes[entityType]) return routes[entityType];
  return null;
}
