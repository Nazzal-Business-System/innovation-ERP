"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { OperationsNavLinks } from "@/components/operations/operations-gate";
import { OperationsTableSkeleton } from "@/components/operations/operations-page-skeleton";
import { DeliveryForm } from "@/components/operations/delivery-form";
import { useI18n } from "@/lib/i18n";

function NewDeliveryContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const soId = searchParams.get("soId") ?? undefined;

  return (
    <>
      <FadeIn>
        <PageHeader title={t("wizard.newDelivery")} description={t("wizard.newDeliveryDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}><OperationsNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <DeliveryForm initialSoId={soId} />
        </div>
      </FadeIn>
    </>
  );
}

export default function NewDeliveryPage() {
  return (
    <ModuleLayout maxWidth="lg">
      <Suspense fallback={<OperationsTableSkeleton />}>
        <NewDeliveryContent />
      </Suspense>
    </ModuleLayout>
  );
}
