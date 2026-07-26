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
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { reservationColumns } from "@/components/inventory/inventory-columns";
import { useInventoryReservations } from "@/lib/hooks/use-inventory";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import type { InventoryReservation } from "@ierp/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "RELEASED", label: "Released" },
  { value: "CONSUMED", label: "Consumed" },
  { value: "CANCELLED", label: "Cancelled" },
];


export default function ReservationsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useInventoryReservations({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(row: InventoryReservation) {
    const href = `/dashboard/inventory/reservations/${row.id}`;
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
        <ErrorState title="Unable to load reservations" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("inventory.reservationsTitle")}
          description={t("inventory.reservationsDesc")}
          badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <InventoryNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search reservations, SO, warehouse…"
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
          columns={reservationColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          serverPagination={serverPagination}
          paginationPosition="mobile-only"
        />
      </FadeIn>
    </ModuleLayout>
  );
}
