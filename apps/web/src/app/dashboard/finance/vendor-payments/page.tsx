"use client";

import { useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinanceTableSkeleton } from "@/components/finance/finance-page-skeleton";
import { RecordVendorPaymentDialog } from "@/components/finance/record-vendor-payment-dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { vendorPaymentColumns } from "@/components/finance/finance-columns";
import { useVendorPayments } from "@/lib/hooks/use-finance";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";

export default function VendorPaymentsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [listSuccess, setListSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([debouncedSearch]);

  const { data, loading, error, refetch } = useVendorPayments({ search: debouncedSearch || undefined, page });

  if (loading && !data) return <ModuleLayout><FinanceTableSkeleton /></ModuleLayout>;
  if (error) return <ModuleLayout maxWidth="lg"><ErrorState title="Unable to load payments" description={error} onRetry={() => void refetch()} /></ModuleLayout>;

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("form.vendorPaymentsTitle")}
          description={t("form.vendorPaymentsDesc")}
          actions={
            <Button className="cursor-pointer gap-2" onClick={() => setDialogOpen(true)} data-testid="record-vendor-payment-btn">
              <Banknote className="h-4 w-4" aria-hidden />
              {t("form.recordVendorPayment")}
            </Button>
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}><FinanceNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <ActionFeedback success={listSuccess} className="mb-4" />
        <div className="space-y-5">
          <TableToolbar
            title={t("form.paymentRegister")}
            searchValue={search}
            onSearchChange={setSearch}
            endAddon={
              <ToolbarPagination
                pagination={data?.pagination}
                onPageChange={onPageChange}
                disabled={loading}
              />
            }
          />
          <DataTable
            columns={vendorPaymentColumns}
            data={data?.data ?? []}
            emptyTitle={t("form.noPayments")}
            serverPagination={serverPagination}
            paginationPosition="mobile-only"
          />
        </div>
      </FadeIn>

      <RecordVendorPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setListSuccess(t("form.paymentRecorded"));
        }}
      />
    </ModuleLayout>
  );
}
