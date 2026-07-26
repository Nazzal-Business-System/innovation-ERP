export type KnowledgeArticleStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
export type KnowledgeVisibility = "INTERNAL" | "PUBLIC" | "SUPPORT_ONLY";

export const KNOWLEDGE_PERMISSIONS = {
  READ: "knowledge.read",
  WRITE: "knowledge.write",
} as const;

export interface KnowledgeCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticleAuthor {
  id: string;
  name: string;
  email: string;
}

export interface KnowledgeArticle {
  id: string;
  articleNumber: string;
  title: string;
  summary: string | null;
  status: KnowledgeArticleStatus;
  visibility: KnowledgeVisibility;
  categoryId: string | null;
  category: { id: string; code: string; name: string } | null;
  authorId: string | null;
  author: KnowledgeArticleAuthor | null;
  publishedAt: string | null;
  tags: string[];
  updatedAt: string;
  createdAt: string;
}

export interface KnowledgeArticleDetail extends KnowledgeArticle {
  content: string;
  documents: Array<{
    id: string;
    documentFileId: string;
    document: {
      id: string;
      fileNumber: string;
      title: string;
      fileName: string;
    };
  }>;
  supportTickets: Array<{
    id: string;
    supportTicketId: string;
    ticket: {
      id: string;
      ticketNumber: string;
      title: string;
      status: string;
    };
  }>;
}

export interface KnowledgeOverview {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  reviewArticles: number;
  archivedArticles: number;
  articlesByCategory: Array<{ categoryId: string; name: string; count: number }>;
  popularArticles: KnowledgeArticle[];
  recentArticles: KnowledgeArticle[];
  articlesInReview: KnowledgeArticle[];
  supportLinkedArticles: number;
  documentLinkedArticles: number;
}

export interface KnowledgeTagStat {
  tag: string;
  count: number;
}

export interface KnowledgeSummaryReport {
  totalArticles: number;
  publishedArticles: number;
  reviewArticles: number;
  draftArticles: number;
  archivedArticles: number;
  topCategories: Array<{ name: string; count: number }>;
  supportLinkedArticles: number;
  recentArticles: KnowledgeArticle[];
}

export interface CreateKnowledgeCategoryInput {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateKnowledgeCategoryInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateKnowledgeArticleInput {
  title: string;
  summary?: string | null;
  content: string;
  categoryId?: string | null;
  visibility?: KnowledgeVisibility;
  status?: KnowledgeArticleStatus;
  tags?: string[];
}

export interface UpdateKnowledgeArticleInput {
  title?: string;
  summary?: string | null;
  content?: string;
  categoryId?: string | null;
  visibility?: KnowledgeVisibility;
  status?: KnowledgeArticleStatus;
  tags?: string[];
}

export interface PaginatedKnowledgeArticles {
  data: KnowledgeArticle[];
  total: number;
  page: number;
  pageSize: number;
}
