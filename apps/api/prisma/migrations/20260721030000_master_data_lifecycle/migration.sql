-- Phase 2B.2: nullable lifecycle metadata; existing data remains active.
ALTER TABLE "customers"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "restored_at" TIMESTAMP(3);

ALTER TABLE "vendors"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "restored_at" TIMESTAMP(3);

ALTER TABLE "products"
  ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "restored_at" TIMESTAMP(3);

ALTER TABLE "warehouses"
  ADD COLUMN "deactivated_at" TIMESTAMP(3),
  ADD COLUMN "reactivated_at" TIMESTAMP(3);

ALTER TABLE "employees"
  ADD COLUMN "deactivated_at" TIMESTAMP(3),
  ADD COLUMN "reactivated_at" TIMESTAMP(3);

ALTER TABLE "accounts"
  ADD COLUMN "is_protected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deactivated_at" TIMESTAMP(3),
  ADD COLUMN "reactivated_at" TIMESTAMP(3);

-- Accounts referenced by automated finance posting are control accounts.
UPDATE "accounts"
SET "is_protected" = true
WHERE "code" IN ('1000', '1010', '1100', '1200', '2000', '2100', '4000');

CREATE INDEX "products_organization_id_is_archived_idx"
  ON "products"("organization_id", "is_archived");
