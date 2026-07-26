-- AlterEnum: add PARTIALLY_PAID between PROCESSED and PAID conceptually
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PayrollStatus' AND e.enumlabel = 'PARTIALLY_PAID'
  ) THEN
    ALTER TYPE "PayrollStatus" ADD VALUE 'PARTIALLY_PAID';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "payroll_lines" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "payroll_lines" ADD COLUMN IF NOT EXISTS "paid_by_id" TEXT;
ALTER TABLE "payroll_lines" ADD COLUMN IF NOT EXISTS "payment_reference" TEXT;
ALTER TABLE "payroll_lines" ADD COLUMN IF NOT EXISTS "payment_journal_entry_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payroll_lines_organization_id_status_idx"
  ON "payroll_lines"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "payroll_lines_organization_id_payment_journal_entry_id_idx"
  ON "payroll_lines"("organization_id", "payment_journal_entry_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_lines_paid_by_id_fkey'
  ) THEN
    ALTER TABLE "payroll_lines"
      ADD CONSTRAINT "payroll_lines_paid_by_id_fkey"
      FOREIGN KEY ("paid_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_lines_payment_journal_entry_id_fkey'
  ) THEN
    ALTER TABLE "payroll_lines"
      ADD CONSTRAINT "payroll_lines_payment_journal_entry_id_fkey"
      FOREIGN KEY ("payment_journal_entry_id") REFERENCES "journal_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Preserve existing PAID lines: leave paid_at/paid_by null (UI shows Not recorded).
-- Do not fabricate payment actors or journals for historical rows.
