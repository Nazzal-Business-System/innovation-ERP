-- CreateEnum
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KnowledgeVisibility" AS ENUM ('INTERNAL', 'PUBLIC', 'SUPPORT_ONLY');

-- AlterEnum
ALTER TYPE "NotificationModule" ADD VALUE 'KNOWLEDGE';

-- CreateTable
CREATE TABLE "knowledge_categories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category_id" TEXT,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT NOT NULL,
    "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "KnowledgeVisibility" NOT NULL DEFAULT 'INTERNAL',
    "author_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_article_tags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_article_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_article_documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "document_file_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_article_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_article_support_tickets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "support_ticket_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_article_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_categories_organization_id_is_active_idx" ON "knowledge_categories"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_categories_organization_id_code_key" ON "knowledge_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "knowledge_articles_organization_id_status_idx" ON "knowledge_articles"("organization_id", "status");

-- CreateIndex
CREATE INDEX "knowledge_articles_organization_id_visibility_idx" ON "knowledge_articles"("organization_id", "visibility");

-- CreateIndex
CREATE INDEX "knowledge_articles_organization_id_category_id_idx" ON "knowledge_articles"("organization_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_articles_organization_id_article_number_key" ON "knowledge_articles"("organization_id", "article_number");

-- CreateIndex
CREATE INDEX "knowledge_article_tags_organization_id_tag_idx" ON "knowledge_article_tags"("organization_id", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_article_tags_organization_id_article_id_tag_key" ON "knowledge_article_tags"("organization_id", "article_id", "tag");

-- CreateIndex
CREATE INDEX "knowledge_article_documents_organization_id_document_file_i_idx" ON "knowledge_article_documents"("organization_id", "document_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_article_documents_organization_id_article_id_docu_key" ON "knowledge_article_documents"("organization_id", "article_id", "document_file_id");

-- CreateIndex
CREATE INDEX "knowledge_article_support_tickets_organization_id_support_t_idx" ON "knowledge_article_support_tickets"("organization_id", "support_ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_article_support_tickets_organization_id_article_i_key" ON "knowledge_article_support_tickets"("organization_id", "article_id", "support_ticket_id");

-- AddForeignKey
ALTER TABLE "knowledge_categories" ADD CONSTRAINT "knowledge_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "knowledge_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_tags" ADD CONSTRAINT "knowledge_article_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_tags" ADD CONSTRAINT "knowledge_article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_documents" ADD CONSTRAINT "knowledge_article_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_documents" ADD CONSTRAINT "knowledge_article_documents_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_documents" ADD CONSTRAINT "knowledge_article_documents_document_file_id_fkey" FOREIGN KEY ("document_file_id") REFERENCES "document_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_support_tickets" ADD CONSTRAINT "knowledge_article_support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_support_tickets" ADD CONSTRAINT "knowledge_article_support_tickets_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_article_support_tickets" ADD CONSTRAINT "knowledge_article_support_tickets_support_ticket_id_fkey" FOREIGN KEY ("support_ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
