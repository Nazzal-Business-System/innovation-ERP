import type { Notification as PrismaNotification } from "@prisma/client";
import type { Notification } from "@ierp/shared";

export function serializeNotification(row: PrismaNotification): Notification {
  return {
    id: row.id,
    type: row.type,
    module: row.module,
    title: row.title,
    message: row.message,
    entityType: row.entityType,
    entityId: row.entityId,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
