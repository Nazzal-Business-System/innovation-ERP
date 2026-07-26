"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OperationsNavLinks } from "@/components/operations/operations-gate";
import { OperationsTableSkeleton } from "@/components/operations/operations-page-skeleton";
import { GoodsReceiptForm } from "@/components/operations/goods-receipt-form";
import { useI18n } from "@/lib/i18n";

function NewGoodsReceiptContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const poId = searchParams.get("poId") ?? undefined;

  return (
    <>
      <FadeIn>
        <PageHeader title={t("wizard.newGoodsReceipt")} description={t("wizard.newGoodsReceiptDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}><OperationsNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <GoodsReceiptForm initialPoId={poId} />
        </div>
      </FadeIn>
    </>
  );
}

export default function NewGoodsReceiptPage() {
  return (
    <ModuleLayout maxWidth="lg">
      <Suspense fallback={<OperationsTableSkeleton />}>
        <NewGoodsReceiptContent />
      </Suspense>
    </ModuleLayout>
  );
}
