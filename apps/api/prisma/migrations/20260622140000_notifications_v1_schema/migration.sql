-- Recreate notifications with V1 schema (type/module enums, isRead, optional userId)

DROP TABLE IF EXISTS "notifications";
DROP TYPE IF EXISTS "NotificationType";
DROP TYPE IF EXISTS "NotificationModule";

CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "NotificationModule" AS ENUM ('SYSTEM', 'INVENTORY', 'PROCUREMENT', 'SALES', 'ACCOUNTING', 'HR', 'REPORTS');

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "NotificationType" NOT NULL,
    "module" "NotificationModule" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
CREATE INDEX "notifications_organization_id_user_id_is_read_idx" ON "notifications"("organization_id", "user_id", "is_read");
CREATE INDEX "notifications_organization_id_module_created_at_idx" ON "notifications"("organization_id", "module", "created_at");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
