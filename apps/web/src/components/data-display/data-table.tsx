"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { TablePagination } from "./table-pagination";
import { Inbox } from "lucide-react";

export type DataTableServerPagination = {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  pageSize?: number;
  interactiveRows?: boolean;
  onRowClick?: (row: TData) => void;
  /**
   * When set, rows are not client-sliced — the parent owns server page state.
   * Compact pager renders above the table (mobile also gets a footer variant).
   */
  serverPagination?: DataTableServerPagination;
  /**
   * - `inline`: desktop top + mobile footer (default)
   * - `mobile-only`: only sticky/footer control (toolbar already has desktop pager)
   * - `none`: no pager chrome (parent owns UI entirely)
   */
  paginationPosition?: "inline" | "mobile-only" | "none";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyTitle = "No results",
  emptyDescription = "There is nothing to display yet.",
  className,
  pageSize = 10,
  interactiveRows = false,
  onRowClick,
  serverPagination,
  paginationPosition = "inline",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const isServerPaged = Boolean(serverPagination);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: isServerPaged ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize } },
    manualPagination: isServerPaged,
  });

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  const isInteractive = interactiveRows || Boolean(onRowClick);
  const clientPageCount = table.getPageCount();
  const hasPager =
    paginationPosition !== "none" &&
    ((serverPagination != null && serverPagination.totalPages > 1) ||
      (!isServerPaged && clientPageCount > 1));

  const pagerProps =
    serverPagination != null && serverPagination.totalPages > 1
      ? {
          page: serverPagination.page,
          totalPages: serverPagination.totalPages,
          totalItems: serverPagination.totalItems,
          pageSize: serverPagination.pageSize,
          onPageChange: serverPagination.onPageChange,
          disabled: serverPagination.disabled,
        }
      : !isServerPaged && clientPageCount > 1
        ? {
            page: table.getState().pagination.pageIndex + 1,
            totalPages: clientPageCount,
            totalItems: data.length,
            pageSize: table.getState().pagination.pageSize,
            onPageChange: (next: number) => table.setPageIndex(next - 1),
            disabled: false as boolean | undefined,
          }
        : null;

  const showDesktopInline = hasPager && paginationPosition === "inline" && pagerProps;
  const showMobileFooter =
    hasPager &&
    pagerProps &&
    (paginationPosition === "inline" || paginationPosition === "mobile-only");

  return (
    <div className={cn("space-y-3", className)}>
      {showDesktopInline && (
        <div className="flex justify-end max-sm:hidden">
          <TablePagination {...pagerProps} />
        </div>
      )}
      <div className="ierp-data-panel">
        <Table>
          <TableHeader className="ierp-data-panel-header">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(isInteractive && "ierp-table-row-interactive")}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement | null;
                        if (
                          target?.closest(
                            "input, button, a, label, textarea, select, [data-row-click-ignore]"
                          )
                        ) {
                          return;
                        }
                        onRowClick(row.original);
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        const target = e.target as HTMLElement | null;
                        if (target?.closest("input, button, a, label, textarea, select")) {
                          return;
                        }
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showMobileFooter && (
        <div className="flex justify-center sm:hidden">
          <TablePagination {...pagerProps} variant="footer" />
        </div>
      )}
    </div>
  );
}
