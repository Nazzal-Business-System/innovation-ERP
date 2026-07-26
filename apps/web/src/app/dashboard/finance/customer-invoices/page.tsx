"use client";

import { useRouter } from "next/navigation";
import { selectClassName } from "@/lib/form-utils";
import { useEffect, useState } from "react";
import Link from "next/link";
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
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinanceTableSkeleton } from "@/components/finance/finance-page-skeleton";
import { customerInvoiceColumns } from "@/components/finance/finance-columns";
import { useCustomerInvoices } from "@/lib/hooks/use-finance";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import type { FinanceCustomerInvoice } from "@ierp/shared";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];


export default function CustomerInvoicesPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch, status]);

  const { data, loading, error, refetch } = useCustomerInvoices({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(inv: FinanceCustomerInvoice) {
    const href = `/dashboard/finance/customer-invoices/${inv.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <FinanceTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load invoices" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Customer Invoices"
          description="Sales invoices, balances, and payment tracking."
          badge={data ? <Badge variant="secondary">{data.pagination.total} invoices</Badge> : undefined}
        />
      </FadeIn>
      <FadeIn delay={0.04}><FinanceNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Invoice register"
            description="Click any row to view lines, payments, and balance."
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
              <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={cn(selectClassName, "min-w-[10rem]")}>
                {STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            }
          />
          <DataTable
            columns={[
              ...customerInvoiceColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link href={`/dashboard/finance/customer-invoices/${row.original.id}`} className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline" onClick={(e) => e.stopPropagation()}>View</Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No invoices found"
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
