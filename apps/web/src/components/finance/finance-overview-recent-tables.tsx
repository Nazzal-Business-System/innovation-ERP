"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import {
  customerInvoiceColumns,
  customerPaymentColumns,
  vendorBillColumns,
  vendorPaymentColumns,
} from "@/components/finance/finance-columns";
import type { FinanceOverview } from "@ierp/shared";

/** Secondary finance tables — split so overview KPIs paint without the columns barrel. */
export function FinanceOverviewRecentTables({ overview }: { overview: FinanceOverview }) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <FadeIn delay={0.1}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-lg font-semibold">Recent Invoices</h2>
              <Link
                href="/dashboard/finance/customer-invoices"
                className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <DataTable
              columns={customerInvoiceColumns.slice(0, 5)}
              data={overview.recentInvoices}
              pageSize={5}
              emptyTitle="No invoices"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-lg font-semibold">Recent Bills</h2>
              <Link
                href="/dashboard/finance/vendor-bills"
                className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <DataTable
              columns={vendorBillColumns.slice(0, 5)}
              data={overview.recentBills}
              pageSize={5}
              emptyTitle="No bills"
            />
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.14}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <CardDescription>Customer receipts and vendor disbursements</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <DataTable
                columns={customerPaymentColumns}
                data={overview.recentCustomerPayments}
                pageSize={4}
                emptyTitle="No customer payments"
              />
              <DataTable
                columns={vendorPaymentColumns}
                data={overview.recentVendorPayments}
                pageSize={4}
                emptyTitle="No vendor payments"
              />
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </>
  );
}

export function FinanceOverviewRecentTablesSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
        <div className="h-48 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
      </div>
      <div className="h-56 animate-pulse rounded-xl bg-[var(--muted-bg)]" />
    </div>
  );
}
