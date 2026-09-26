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
import { SalesNavLinks } from "@/components/sales/sales-gate";
import { SalesPageSkeleton } from "@/components/sales/sales-page-skeleton";
import { salesOrderColumns } from "@/components/sales/sales-columns";
import { useSalesOrders } from "@/lib/hooks/use-sales";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { SALES_PERMISSIONS, type SalesOrder } from "@ierp/shared";
import { cn } from "@/lib/utils";

const SO_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PICKING", label: "Picking" },
  { value: "READY_TO_SHIP", label: "Ready to ship" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "INVOICED", label: "Invoiced" },
  { value: "CANCELLED", label: "Cancelled" },
];


export default function SalesOrdersPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SALES_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useSalesOrders({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(order: SalesOrder) {
    const href = `/dashboard/sales/orders/${order.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <SalesPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load sales orders" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Sales Orders"
          description="Outbound orders from draft through invoicing — Amman and Irbid fulfillment."
          badge={data ? <Badge variant="secondary">{data.pagination.total} orders</Badge> : undefined}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/sales/orders/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("form.newSalesOrder")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SalesNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Sales order register"
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
                {SO_STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataTable
            columns={[
              ...salesOrderColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/sales/orders/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No sales orders found"
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
