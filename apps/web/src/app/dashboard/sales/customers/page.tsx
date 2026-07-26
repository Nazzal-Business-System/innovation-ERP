"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { customerColumns } from "@/components/sales/sales-columns";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import {
  SALES_PERMISSIONS,
  type CustomerSort,
  type SalesCustomer,
} from "@ierp/shared";
import { cn } from "@/lib/utils";

const CreateCustomerDialog = dynamic(
  () =>
    import("@/components/sales/create-customer-dialog").then((m) => ({
      default: m.CreateCustomerDialog,
    })),
  { ssr: false }
);

const CUSTOMER_TYPES = ["RETAILER", "WHOLESALER", "CORPORATE", "DISTRIBUTOR"] as const;

const CUSTOMER_SORTS: CustomerSort[] = [
  "NEWEST",
  "OLDEST",
  "NAME_ASC",
  "NAME_DESC",
  "CODE_ASC",
  "CODE_DESC",
  "CREDIT_DESC",
  "CREDIT_ASC",
];

const PAGE_SIZES = [10, 20, 50] as const;


export default function CustomersPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SALES_PERMISSIONS.WRITE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [sort, setSort] = useState<CustomerSort>("NEWEST");
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const active = activeFilter === "all" ? undefined : activeFilter === "active";
  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    customerType,
    activeFilter,
    sort,
    pageSize,
  ]);

  const { data, loading, error, refetch } = useSalesCustomers({
    search: debouncedSearch || undefined,
    customerType: customerType || undefined,
    active,
    sort,
    pageSize,
    page,
  });

  function handleRowClick(customer: SalesCustomer) {
    const href = `/dashboard/sales/customers/${customer.id}`;
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
        <ErrorState title="Unable to load customers" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("nav.customers", "Customers")}
          description={t(
            "sales.customersDesc",
            "Retail, wholesale, corporate, and distributor accounts across Jordan."
          )}
          badge={
            data ? (
              <Badge variant="secondary">
                {data.pagination.total} {t("nav.customers", "customers").toLowerCase()}
              </Badge>
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
                {t("masterData.createCustomer", "Create customer")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SalesNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title={t("sales.customerDirectory", "Customer directory")}
            description={t(
              "sales.customerDirectoryDesc",
              "Click any row to view profile and order history."
            )}
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
                  aria-label={t("sales.filterCustomerType", "Filter by customer type")}
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="">{t("sales.allCustomerTypes", "All types")}</option>
                  {CUSTOMER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`sales.customerType.${type}`, type.replaceAll("_", " "))}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("sales.filterCustomerStatus", "Filter by status")}
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  <option value="all">{t("sales.allCustomers", "All customers")}</option>
                  <option value="active">{t("sales.activeCustomersOnly", "Active only")}</option>
                  <option value="inactive">{t("sales.archivedCustomersOnly", "Archived only")}</option>
                </select>
                <select
                  aria-label={t("sales.sortCustomers", "Sort customers")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as CustomerSort)}
                  className={cn(selectClassName, "min-w-[11rem]")}
                >
                  {CUSTOMER_SORTS.map((value) => (
                    <option key={value} value={value}>
                      {t(`sales.customerSort.${value}`, value.replaceAll("_", " "))}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("pagination.pageSize", "Rows per page")}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={cn(selectClassName, "min-w-[8rem]")}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {t("pagination.rows", "{count} rows").replace("{count}", String(size))}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <DataTable
            columns={customerColumns}
            data={data?.data ?? []}
            emptyTitle="No customers found"
            emptyDescription="Try adjusting your search or filters."
            onRowClick={handleRowClick}
            interactiveRows
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>

      {canWrite && createOpen ? (
        <CreateCustomerDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </ModuleLayout>
  );
}
