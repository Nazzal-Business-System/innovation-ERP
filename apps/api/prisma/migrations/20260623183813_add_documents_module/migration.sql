-- CreateEnum
CREATE TYPE "ErpDocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "DocumentModule" AS ENUM ('HR', 'FINANCE', 'PROCUREMENT', 'SALES', 'SUPPORT', 'PROJECTS', 'CRM', 'OPERATIONS', 'ACCOUNTING', 'SYSTEM');

-- AlterEnum
ALTER TYPE "NotificationModule" ADD VALUE 'DOCUMENTS';

-- CreateTable
CREATE TABLE "document_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category_id" TEXT,
    "file_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" "ErpDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiry_date" TIMESTAMP(3),
    "uploaded_by_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "document_file_id" TEXT NOT NULL,
    "module" "DocumentModule" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_categories_organization_id_is_active_idx" ON "document_categories"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "document_categories_organization_id_code_key" ON "document_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "document_files_organization_id_status_idx" ON "document_files"("organization_id", "status");

-- CreateIndex
CREATE INDEX "document_files_organization_id_expiry_date_idx" ON "document_files"("organization_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "document_files_organization_id_file_number_key" ON "document_files"("organization_id", "file_number");

-- CreateIndex
CREATE INDEX "document_links_organization_id_module_entity_type_entity_id_idx" ON "document_links"("organization_id", "module", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "document_links_organization_id_document_file_id_idx" ON "document_links"("organization_id", "document_file_id");

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_links" ADD CONSTRAINT "document_links_document_file_id_fkey" FOREIGN KEY ("document_file_id") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
