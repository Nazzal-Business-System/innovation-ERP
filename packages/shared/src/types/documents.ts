import type { PaginatedResponse } from "./inventory";

export type ErpDocumentStatus = "ACTIVE" | "EXPIRED" | "ARCHIVED" | "PENDING_REVIEW";

export type DocumentModule =
  | "HR"
  | "FINANCE"
  | "PROCUREMENT"
  | "SALES"
  | "SUPPORT"
  | "PROJECTS"
  | "CRM"
  | "OPERATIONS"
  | "ACCOUNTING"
  | "SYSTEM";

export interface DocumentUserRef {
  id: string;
  name: string;
  email: string;
}

export interface DocumentCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentLink {
  id: string;
  module: DocumentModule;
  entityType: string;
  entityId: string;
  entityLabel?: string | null;
  createdAt: string;
}

export interface DocumentFile {
  id: string;
  fileNumber: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  status: ErpDocumentStatus;
  expiryDate: string | null;
  categoryId: string | null;
  category: { id: string; code: string; name: string } | null;
  uploadedById: string | null;
  uploadedBy: DocumentUserRef | null;
  uploadedAt: string;
  primaryModule: DocumentModule | null;
  linkCount?: number;
  isExpiringSoon?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFileDetail extends DocumentFile {
  links: DocumentLink[];
}

export interface DocumentsOverview {
  totalDocuments: number;
  activeDocuments: number;
  expiredDocuments: number;
  pendingReview: number;
  documentsByModule: Array<{ module: DocumentModule; count: number }>;
  documentsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  expiringSoon: DocumentFile[];
  recentUploads: DocumentFile[];
}

export interface DocumentsSummaryReport {
  generatedAt: string;
  totalDocuments: number;
  activeDocuments: number;
  expiredDocuments: number;
  pendingReview: number;
  expiringIn30Days: number;
  documentsByModule: Array<{ module: DocumentModule; count: number }>;
  documentsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  pendingReviewList: DocumentFile[];
  expiredList: DocumentFile[];
  expiringSoonList: DocumentFile[];
}

export interface CreateDocumentCategoryInput {
  code?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDocumentCategoryInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateDocumentFileInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status?: ErpDocumentStatus;
  expiryDate?: string | null;
  link?: {
    module: DocumentModule;
    entityType: string;
    entityId: string;
  } | null;
}

export interface UpdateDocumentFileInput {
  title?: string;
  description?: string | null;
  categoryId?: string | null;
  expiryDate?: string | null;
  /** Non-archive status only from metadata edit; archive stays on dedicated endpoint. */
  status?: Exclude<ErpDocumentStatus, "ARCHIVED">;
}

export interface CreateDocumentLinkInput {
  documentFileId: string;
  module: DocumentModule;
  entityType: string;
  entityId: string;
}

export const DOCUMENTS_PERMISSIONS = {
  READ: "documents.read",
  WRITE: "documents.write",
} as const;

export type DocumentFilesListResponse = PaginatedResponse<DocumentFile>;
export type DocumentCategoriesListResponse = PaginatedResponse<DocumentCategory>;
export type DocumentLinksListResponse = PaginatedResponse<DocumentLink>;
