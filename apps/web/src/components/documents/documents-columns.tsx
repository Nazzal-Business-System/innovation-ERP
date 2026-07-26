"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { DocumentCategory, DocumentFile, DocumentModule, ErpDocumentStatus } from "@ierp/shared";
import { StatusBadge } from "@/components/data-display/status-badge";
import { formatDisplayDate } from "@/lib/date";
import type { Locale } from "@/lib/i18n/types";

export function documentStatusVariant(
  status: ErpDocumentStatus
): "active" | "pending" | "info" | "draft" | "inactive" | "error" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "PENDING_REVIEW":
      return "pending";
    case "EXPIRED":
      return "error";
    case "ARCHIVED":
      return "inactive";
    default:
      return "draft";
  }
}

export const DOCUMENT_STATUS_LABELS: Record<ErpDocumentStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
  PENDING_REVIEW: "Pending Review",
};

export const DOCUMENT_MODULE_LABELS: Record<DocumentModule, string> = {
  HR: "HR",
  FINANCE: "Finance",
  PROCUREMENT: "Procurement",
  SALES: "Sales",
  SUPPORT: "Support",
  PROJECTS: "Projects",
  CRM: "CRM",
  OPERATIONS: "Operations",
  ACCOUNTING: "Accounting",
  SYSTEM: "System",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileColumnsForLocale(locale: Locale): ColumnDef<DocumentFile>[] {
  return [
  {
    accessorKey: "fileNumber",
    header: "File #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/documents/files/${row.original.id}`}
        className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.fileNumber}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    id: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.category?.name ?? "—"}</span>
    ),
  },
  {
    id: "module",
    header: "Module",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {row.original.primaryModule
          ? DOCUMENT_MODULE_LABELS[row.original.primaryModule]
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={documentStatusVariant(row.original.status)}
        label={DOCUMENT_STATUS_LABELS[row.original.status]}
      />
    ),
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry",
    cell: ({ row }) => (
      <span
        className={
          row.original.isExpiringSoon || row.original.status === "EXPIRED"
            ? "text-sm font-medium text-[var(--destructive)]"
            : "text-sm text-[var(--muted)]"
        }
      >
        {formatDisplayDate(row.original.expiryDate, locale)}
      </span>
    ),
  },
  {
    id: "uploadedBy",
    header: "Uploaded By",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.uploadedBy?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "fileSize",
    header: "Size",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-[var(--muted)]">
        {formatBytes(row.original.fileSize)}
      </span>
    ),
  },
  ];
}

export const fileColumns = fileColumnsForLocale("en");

export const categoryColumns: ColumnDef<DocumentCategory>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/documents/categories/${row.original.id}`}
        className="cursor-pointer font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.description ?? "—"}</span>
    ),
  },
  {
    accessorKey: "documentCount",
    header: "Documents",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.documentCount ?? 0}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.isActive ? "active" : "inactive"}
        label={row.original.isActive ? "Active" : "Inactive"}
      />
    ),
  },
];
