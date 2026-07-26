"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
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
import { CreateVendorDialog } from "@/components/procurement/create-vendor-dialog";
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { ProcurementPageSkeleton } from "@/components/procurement/procurement-page-skeleton";
import { vendorColumns } from "@/components/procurement/procurement-columns";
import { useProcurementVendors } from "@/lib/hooks/use-procurement";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { PROCUREMENT_PERMISSIONS, type ProcurementVendor } from "@ierp/shared";
import { cn } from "@/lib/utils";


export default function VendorsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROCUREMENT_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("active");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const active = activeFilter === "all" ? undefined : activeFilter === "active";
  const { page, onPageChange } = useServerPagination([debouncedSearch, activeFilter]);

  const { data, loading, error, refetch } = useProcurementVendors({
    search: debouncedSearch || undefined,
    active,
    page,
  });

  function handleRowClick(vendor: ProcurementVendor) {
    const href = `/dashboard/procurement/vendors/${vendor.id}`;
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
        <ErrorState title="Unable to load vendors" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("nav.vendors", "Vendors")}
          description="Supplier directory for Al-Noor Trading — beverages, grocery, dairy, and more."
          badge={
            data ? (
              <Badge variant="secondary">{data.pagination.total} vendors</Badge>
            ) : undefined
          }
          actions={
            canWrite ? (
              <Button
                type="button"
                className="cursor-pointer gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("masterData.createVendor", "Create vendor")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <ProcurementNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Vendor directory"
            description="Click any row to view vendor profile and purchase history."
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
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className={cn(selectClassName, "min-w-[9rem]")}
              >
                <option value="all">All vendors</option>
                <option value="active">Active only</option>
                <option value="inactive">Archived only</option>
              </select>
            }
          />
          <DataTable
            columns={vendorColumns}
            data={data?.data ?? []}
            emptyTitle="No vendors found"
            emptyDescription="Try adjusting your search or filters."
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>

      {canWrite ? <CreateVendorDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
    </ModuleLayout>
  );
}
