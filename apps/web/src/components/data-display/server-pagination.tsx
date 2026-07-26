"use client";

import { TablePagination } from "@/components/data-display/table-pagination";
import type { DataTableServerPagination } from "@/components/data-display/data-table";

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function toServerPagination(
  pagination: PaginatedMeta | undefined,
  onPageChange: (page: number) => void,
  disabled?: boolean
): DataTableServerPagination | undefined {
  if (!pagination || pagination.totalPages <= 1) return undefined;
  return {
    page: pagination.page,
    totalPages: pagination.totalPages,
    totalItems: pagination.total,
    pageSize: pagination.limit,
    onPageChange,
    disabled,
  };
}

/** Desktop toolbar control; pair with DataTable paginationPosition="mobile-only". */
export function ToolbarPagination({
  pagination,
  onPageChange,
  disabled,
}: {
  pagination: PaginatedMeta | undefined;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <TablePagination
      className="ms-auto hidden sm:inline-flex"
      page={pagination.page}
      totalPages={pagination.totalPages}
      totalItems={pagination.total}
      pageSize={pagination.limit}
      onPageChange={onPageChange}
      disabled={disabled}
    />
  );
}
