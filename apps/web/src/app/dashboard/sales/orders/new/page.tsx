"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SalesNavLinks } from "@/components/sales/sales-gate";
import { SalesOrderForm } from "@/components/sales/sales-order-form";
import { useI18n } from "@/lib/i18n";

export default function NewSalesOrderPage() {
  const { t } = useI18n();

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("form.newSalesOrder")} description={t("form.newSalesOrderDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <SalesNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <SalesOrderForm />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
