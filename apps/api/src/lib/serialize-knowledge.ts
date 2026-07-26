import type {
  KnowledgeArticle,
  KnowledgeArticleDetail,
  KnowledgeArticleStatus,
  KnowledgeCategory,
  KnowledgeVisibility,
} from "@ierp/shared";

type UserRow = { id: string; name: string; email: string } | null;
type CategoryRow = { id: string; code: string; name: string } | null;

type ArticleRow = {
  id: string;
  articleNumber: string;
  title: string;
  summary: string | null;
  content?: string;
  status: string;
  visibility: string;
  categoryId: string | null;
  category: CategoryRow;
  authorId: string | null;
  author: UserRow;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{ tag: string }>;
  documents?: Array<{
    id: string;
    documentFileId: string;
    documentFile: { id: string; fileNumber: string; title: string; fileName: string };
  }>;
  supportTickets?: Array<{
    id: string;
    supportTicketId: string;
    supportTicket: { id: string; ticketNumber: string; title: string; status: string };
  }>;
  _count?: { tags: number; documents: number; supportTickets: number };
};

type CategoryFullRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { articles: number };
};

function serializeAuthor(author: UserRow) {
  if (!author) return null;
  return { id: author.id, name: author.name, email: author.email };
}

export function serializeCategory(row: CategoryFullRow): KnowledgeCategory {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    articleCount: row._count?.articles ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeArticle(row: ArticleRow): KnowledgeArticle {
  return {
    id: row.id,
    articleNumber: row.articleNumber,
    title: row.title,
    summary: row.summary,
    status: row.status as KnowledgeArticleStatus,
    visibility: row.visibility as KnowledgeVisibility,
    categoryId: row.categoryId,
    category: row.category
      ? { id: row.category.id, code: row.category.code, name: row.category.name }
      : null,
    authorId: row.authorId,
    author: serializeAuthor(row.author),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    tags: row.tags?.map((t) => t.tag) ?? [],
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeArticleDetail(row: ArticleRow): KnowledgeArticleDetail {
  return {
    ...serializeArticle(row),
    content: row.content ?? "",
    documents:
      row.documents?.map((d) => ({
        id: d.id,
        documentFileId: d.documentFileId,
        document: {
          id: d.documentFile.id,
          fileNumber: d.documentFile.fileNumber,
          title: d.documentFile.title,
          fileName: d.documentFile.fileName,
        },
      })) ?? [],
    supportTickets:
      row.supportTickets?.map((s) => ({
        id: s.id,
        supportTicketId: s.supportTicketId,
        ticket: {
          id: s.supportTicket.id,
          ticketNumber: s.supportTicket.ticketNumber,
          title: s.supportTicket.title,
          status: s.supportTicket.status,
        },
      })) ?? [],
  };
}
