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
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { transferColumns } from "@/components/inventory/inventory-columns";
import { useInventoryTransfers } from "@/lib/hooks/use-inventory";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { INVENTORY_PERMISSIONS, type InventoryTransfer } from "@ierp/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];


export default function TransfersPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(INVENTORY_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useInventoryTransfers({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(row: InventoryTransfer) {
    const href = `/dashboard/inventory/transfers/${row.id}`;
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
        <ErrorState title="Unable to load transfers" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("inventory.transfersTitle")}
          description={t("inventory.transfersDesc")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          actions={canWrite ? (
            <Button asChild className="cursor-pointer gap-2">
              <Link href="/dashboard/inventory/transfers/new">
                <Plus className="h-4 w-4" aria-hidden />
                {t("inventory.newTransfer")}
              </Link>
            </Button>
          ) : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <InventoryNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search transfers, warehouses…"
          endAddon={
            <ToolbarPagination
              pagination={data?.pagination}
              onPageChange={onPageChange}
              disabled={loading}
            />
          }
          actions={
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClassName}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          }
        />
      </FadeIn>

      <FadeIn delay={0.08}>
        <DataTable
          columns={transferColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
