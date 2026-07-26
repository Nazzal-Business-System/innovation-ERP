"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { TransferForm } from "@/components/inventory/transfer-form";
import { useI18n } from "@/lib/i18n";

export default function NewTransferPage() {
  const { t } = useI18n();

  return (
    <ModuleLayout maxWidth="lg">
      <FadeIn>
        <PageHeader title={t("inventory.newTransfer")} description={t("inventory.newTransferDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <InventoryNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-6">
          <TransferForm />
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
