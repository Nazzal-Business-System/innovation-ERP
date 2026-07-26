-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'LeaveStatus' AND e.enumlabel = 'CANCELLED'
  ) THEN
    ALTER TYPE "LeaveStatus" ADD VALUE 'CANCELLED';
  END IF;
END $$;
