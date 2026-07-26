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
import { AccountingNavLinks } from "@/components/accounting/accounting-gate";
import { accountColumns } from "@/components/accounting/accounting-columns";
import { AccountingTableSkeleton } from "@/components/accounting/accounting-page-skeleton";
import { ACCOUNT_TYPE_LABELS } from "@/components/accounting/je-status-badge";
import { useAccountingAccounts } from "@/lib/hooks/use-accounting";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import type { AccountingAccount } from "@ierp/shared";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  { value: "", label: "All types" },
  ...Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const ACTIVE_FILTERS = [
  { value: "", label: "All accounts" },
  { value: "true", label: "Active only" },
  { value: "false", label: "Inactive only" },
];


export default function ChartOfAccountsPage() {
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const active =
    activeFilter === "" ? undefined : activeFilter === "true";

  const { page, onPageChange } = useServerPagination([debouncedSearch, type, activeFilter]);

  const { data, loading, error, refetch } = useAccountingAccounts({
    search: debouncedSearch || undefined,
    type: type || undefined,
    active,
    page,
  });

  function handleRowClick(account: AccountingAccount) {
    const href = `/dashboard/accounting/chart-of-accounts/${account.id}`;
    startNavigation(href);
    router.push(href);
  }

  if (loading && !data) {
    return (
      <ModuleLayout>
        <AccountingTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load chart of accounts"
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
          title="Chart of Accounts"
          description="General ledger account structure — assets, liabilities, equity, revenue, and expenses."
          badge={data ? <Badge variant="secondary">{data.pagination.total} accounts</Badge> : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <AccountingNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Account register"
            description="Click any row to view account profile and recent journal lines."
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
                  aria-label="Filter by type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  {ACCOUNT_TYPES.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by status"
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className={cn(selectClassName, "min-w-[9rem]")}
                >
                  {ACTIVE_FILTERS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <DataTable
            columns={[
              ...accountColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/accounting/chart-of-accounts/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No accounts found"
            emptyDescription="Try adjusting your search or filters."
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
