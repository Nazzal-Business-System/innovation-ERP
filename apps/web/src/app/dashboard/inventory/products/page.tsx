"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { ListPageShell } from "@/components/layout/list-page-shell";
import { ModuleLayout } from "@/components/layout/module-layout";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { productColumns } from "@/components/inventory/inventory-columns";
import { useInventoryProducts } from "@/lib/hooks/use-inventory";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import type { InventoryProduct } from "@ierp/shared";
import { cn } from "@/lib/utils";

const PRODUCT_CATEGORIES = [
  "All categories",
  "Beverages",
  "Grocery",
  "Dairy",
  "Household",
  "Personal Care",
  "Electronics",
] as const;

const PRODUCT_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "DISCONTINUED", label: "Discontinued" },
] as const;


export default function InventoryProductsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [archivedFilter, setArchivedFilter] = useState("false");
  const archived = archivedFilter === "" ? undefined : archivedFilter === "true";
  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    category,
    status,
    archivedFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, refetch } = useInventoryProducts({
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: status || undefined,
    archived,
    page,
  });

  function handleRowClick(product: InventoryProduct) {
    const href = `/dashboard/inventory/products/${product.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load products" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ListPageShell
      title="Products"
      description="SKU catalog with stock levels and valuation across Amman and Irbid warehouses."
      badge={data ? <Badge variant="secondary">{data.pagination.total} SKUs</Badge> : undefined}
      nav={<InventoryNavLinks />}
      toolbar={
        <TableToolbar
          title="Product catalog"
          description="Click any row to view warehouse breakdown and movement history."
          searchValue={search}
          onSearchChange={setSearch}
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="Filter by category"
                value={category || "All categories"}
                onChange={(e) =>
                  setCategory(e.target.value === "All categories" ? "" : e.target.value)
                }
                className={cn(selectClassName, "min-w-[9rem]")}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat === "All categories" ? "" : cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={cn(selectClassName, "min-w-[8rem]")}
              >
                {PRODUCT_STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by lifecycle status"
                value={archivedFilter}
                onChange={(e) => setArchivedFilter(e.target.value)}
                className={cn(selectClassName, "min-w-[9rem]")}
              >
                <option value="false">Active records</option>
                <option value="true">Archived only</option>
                <option value="">All records</option>
              </select>
            </div>
          }
        />
      }
    >
      <div>
        <DataTable
          columns={productColumns}
          data={data?.data ?? []}
          emptyTitle="No products found"
          emptyDescription="Try adjusting your search or filters."
          onRowClick={handleRowClick}
          interactiveRows
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </div>
    </ListPageShell>
  );
}
