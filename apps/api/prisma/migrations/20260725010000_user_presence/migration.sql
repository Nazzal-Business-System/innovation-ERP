-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "presence_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_organization_id_last_seen_at_idx" ON "users"("organization_id", "last_seen_at");
