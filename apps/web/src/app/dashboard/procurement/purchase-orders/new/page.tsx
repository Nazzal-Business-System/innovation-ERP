"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { PurchaseOrderForm } from "@/components/procurement/purchase-order-form";
import { useI18n } from "@/lib/i18n";

export default function NewPurchaseOrderPage() {
  const { t } = useI18n();

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("form.newPurchaseOrder")} description={t("form.newPurchaseOrderDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <ProcurementNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <PurchaseOrderForm />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
