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
import { OperationsNavLinks } from "@/components/operations/operations-gate";
import { OperationsTableSkeleton } from "@/components/operations/operations-page-skeleton";
import { deliveryColumns } from "@/components/operations/operations-columns";
import { useDeliveries } from "@/lib/hooks/use-operations";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { OPERATIONS_PERMISSIONS, SALES_PERMISSIONS, type OperationsDelivery } from "@ierp/shared";
import { cn } from "@/lib/utils";

const DL_STATUSES = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PICKED", label: "Picked" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];


export default function DeliveriesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(OPERATIONS_PERMISSIONS.WRITE, SALES_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useDeliveries({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(delivery: OperationsDelivery) {
    const href = `/dashboard/operations/deliveries/${delivery.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <OperationsTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load deliveries"
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
          title="Deliveries"
          description="Ship sales orders from warehouse — posts inventory issues on deliver."
          badge={
            data ? (
              <Badge variant="secondary">{data.pagination.total} deliveries</Badge>
            ) : undefined
          }
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2" data-testid="new-delivery-btn">
              <Link href="/dashboard/operations/deliveries/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("wizard.newDelivery")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <OperationsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Delivery register"
            description="Click any row to view lines and deliver to customer."
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
                {DL_STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataTable
            columns={[
              ...deliveryColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/operations/deliveries/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No deliveries found"
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
