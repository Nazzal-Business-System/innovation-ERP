"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { ProcurementPageSkeleton } from "@/components/procurement/procurement-page-skeleton";
import { purchaseOrderColumns } from "@/components/procurement/procurement-columns";
import { useProcurementPurchaseOrders } from "@/lib/hooks/use-procurement";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { PROCUREMENT_PERMISSIONS, type ProcurementPurchaseOrder } from "@ierp/shared";
import { cn } from "@/lib/utils";

const PO_STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIALLY_RECEIVED", label: "Partially received" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];


export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROCUREMENT_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useProcurementPurchaseOrders({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(po: ProcurementPurchaseOrder) {
    const href = `/dashboard/procurement/purchase-orders/${po.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <ProcurementPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load purchase orders"
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Purchase Orders"
          description="Vendor orders from draft through receipt — linked to Amman and Irbid warehouses."
          badge={
            data ? (
              <Badge variant="secondary">{data.pagination.total} orders</Badge>
            ) : undefined
          }
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/procurement/purchase-orders/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("form.newPurchaseOrder")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProcurementNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Purchase order register"
            description="Click any row to view line items and order details."
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
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={cn(selectClassName, "min-w-[10rem]")}
              >
                {PO_STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataTable
            columns={[
              ...purchaseOrderColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/procurement/purchase-orders/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No purchase orders found"
            emptyDescription="Try adjusting your search or status filter."
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
