-- Phase 2B.1: Master data notes (nullable; no data reset)
ALTER TABLE "customers" ADD COLUMN "notes" TEXT;
ALTER TABLE "vendors" ADD COLUMN "notes" TEXT;
ALTER TABLE "warehouses" ADD COLUMN "notes" TEXT;
ALTER TABLE "employees" ADD COLUMN "notes" TEXT;
ALTER TABLE "accounts" ADD COLUMN "notes" TEXT;
