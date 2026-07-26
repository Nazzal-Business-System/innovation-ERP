"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { movementColumns } from "@/components/inventory/inventory-columns";
import { useInventoryMovements } from "@/lib/hooks/use-inventory";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";

export default function InventoryMovementsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch]);

  const { data, loading, error, refetch } = useInventoryMovements({
    search: debouncedSearch || undefined,
    page,
  });

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
        <ErrorState title="Unable to load movements" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Stock Movements"
          description="Receipts, issues, transfers, and adjustments across Amman and Irbid warehouses."
          badge={
            data ? (
              <Badge variant="secondary">{data.pagination.total} records</Badge>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <InventoryNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Movement ledger"
            description="Full audit trail of inventory transactions with references."
            searchValue={search}
            onSearchChange={setSearch}
            endAddon={
              <ToolbarPagination
                pagination={data?.pagination}
                onPageChange={onPageChange}
                disabled={loading}
              />
            }
          />
          <DataTable
            columns={movementColumns}
            data={data?.data ?? []}
            emptyTitle="No movements found"
            emptyDescription="Stock transactions will appear here."
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
