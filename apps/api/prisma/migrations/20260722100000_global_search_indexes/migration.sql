-- Search-friendly composite indexes for org-scoped lookups.
-- Exact/prefix matches on codes already use unique indexes; these help filtered scans.

CREATE INDEX IF NOT EXISTS "products_organization_id_name_idx"
  ON "products"("organization_id", "name");

CREATE INDEX IF NOT EXISTS "customers_organization_id_name_idx"
  ON "customers"("organization_id", "name");

CREATE INDEX IF NOT EXISTS "vendors_organization_id_name_idx"
  ON "vendors"("organization_id", "name");

CREATE INDEX IF NOT EXISTS "employees_organization_id_last_name_idx"
  ON "employees"("organization_id", "last_name");

CREATE INDEX IF NOT EXISTS "support_tickets_organization_id_title_idx"
  ON "support_tickets"("organization_id", "title");

CREATE INDEX IF NOT EXISTS "knowledge_articles_organization_id_title_idx"
  ON "knowledge_articles"("organization_id", "title");

CREATE INDEX IF NOT EXISTS "document_files_organization_id_title_idx"
  ON "document_files"("organization_id", "title");
