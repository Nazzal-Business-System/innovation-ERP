import type {
  DocumentCategory,
  DocumentFile,
  DocumentFileDetail,
  DocumentLink,
  DocumentModule,
  ErpDocumentStatus,
} from "@ierp/shared";

type UserRow = { id: string; name: string; email: string } | null;
type CategoryRow = { id: string; code: string; name: string } | null;

type FileRow = {
  id: string;
  fileNumber: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  status: string;
  expiryDate: Date | null;
  categoryId: string | null;
  category: CategoryRow;
  uploadedById: string | null;
  uploadedBy: UserRow;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  links?: Array<{
    id: string;
    module: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }>;
  _count?: { links: number };
};

type CategoryFullRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { files: number };
};

function serializeUser(user: UserRow) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email };
}

function isExpiringSoon(expiryDate: Date | null, now = new Date()): boolean {
  if (!expiryDate) return false;
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return expiryDate >= today && expiryDate <= in30;
}

function primaryModule(file: FileRow): DocumentModule | null {
  if (!file.links || file.links.length === 0) return null;
  return file.links[0].module as DocumentModule;
}

export function serializeFile(file: FileRow, now = new Date()): DocumentFile {
  return {
    id: file.id,
    fileNumber: file.fileNumber,
    title: file.title,
    description: file.description,
    fileName: file.fileName,
    fileUrl: file.fileUrl,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    status: file.status as ErpDocumentStatus,
    expiryDate: file.expiryDate?.toISOString() ?? null,
    categoryId: file.categoryId,
    category: file.category
      ? { id: file.category.id, code: file.category.code, name: file.category.name }
      : null,
    uploadedById: file.uploadedById,
    uploadedBy: serializeUser(file.uploadedBy),
    uploadedAt: file.uploadedAt.toISOString(),
    primaryModule: primaryModule(file),
    linkCount: file._count?.links ?? file.links?.length,
    isExpiringSoon: isExpiringSoon(file.expiryDate, now),
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
}

export function serializeFileDetail(file: FileRow, now = new Date()): DocumentFileDetail {
  return {
    ...serializeFile(file, now),
    links: (file.links ?? []).map((link) => serializeLink(link)),
  };
}

export function serializeLink(link: {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  entityLabel?: string | null;
}): DocumentLink {
  return {
    id: link.id,
    module: link.module as DocumentModule,
    entityType: link.entityType,
    entityId: link.entityId,
    entityLabel: link.entityLabel ?? null,
    createdAt: link.createdAt.toISOString(),
  };
}

export function serializeCategory(category: CategoryFullRow): DocumentCategory {
  return {
    id: category.id,
    code: category.code,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    documentCount: category._count?.files,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
