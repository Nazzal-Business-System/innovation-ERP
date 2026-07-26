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
import { journalEntryColumns } from "@/components/accounting/accounting-columns";
import { AccountingTableSkeleton } from "@/components/accounting/accounting-page-skeleton";
import { JE_STATUS_LABELS } from "@/components/accounting/je-status-badge";
import { useJournalEntries } from "@/lib/hooks/use-accounting";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useNavigation } from "@/lib/navigation-context";
import type { JournalEntry } from "@ierp/shared";
import { cn } from "@/lib/utils";

const JE_STATUSES = [
  { value: "", label: "All statuses" },
  ...Object.entries(JE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];


export default function JournalEntriesPage() {
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

  const { data, loading, error, refetch } = useJournalEntries({
    search: debouncedSearch || undefined,
    status: status || undefined,
    page,
  });

  function handleRowClick(entry: JournalEntry) {
    const href = `/dashboard/accounting/journal-entries/${entry.id}`;
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
          title="Unable to load journal entries"
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
          title="Journal Entries"
          description="General ledger journal — sales, purchases, expenses, and opening balances."
          badge={data ? <Badge variant="secondary">{data.pagination.total} entries</Badge> : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <AccountingNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="space-y-5">
          <TableToolbar
            title="Journal register"
            description="Click any row to view entry lines and balance status."
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
                {JE_STATUSES.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            }
          />
          <DataTable
            columns={[
              ...journalEntryColumns,
              {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                  <Link
                    href={`/dashboard/accounting/journal-entries/${row.original.id}`}
                    className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            data={data?.data ?? []}
            emptyTitle="No journal entries found"
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
