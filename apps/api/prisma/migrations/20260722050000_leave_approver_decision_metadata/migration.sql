-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "assigned_approver_id" TEXT;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "decided_by_id" TEXT;
ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "decided_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "leave_requests_organization_id_assigned_approver_id_idx" ON "leave_requests"("organization_id", "assigned_approver_id");
CREATE INDEX IF NOT EXISTS "leave_requests_organization_id_decided_by_id_idx" ON "leave_requests"("organization_id", "decided_by_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_assigned_approver_id_fkey'
  ) THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_assigned_approver_id_fkey"
      FOREIGN KEY ("assigned_approver_id") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leave_requests_decided_by_id_fkey'
  ) THEN
    ALTER TABLE "leave_requests"
      ADD CONSTRAINT "leave_requests_decided_by_id_fkey"
      FOREIGN KEY ("decided_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
