"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CategoryDetailWorkspace } from "@/components/entity-workspace/category-detail-workspace";
import { ErrorState } from "@/components/feedback/error-state";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SupportNavLinks } from "@/components/support/support-gate";
import { SupportDetailSkeleton } from "@/components/support/support-page-skeleton";
import {
  useDeleteSupportCategory,
  useSupportCategory,
  useUpdateSupportCategory,
} from "@/lib/hooks/use-support";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_PERMISSIONS } from "@ierp/shared";

export default function SupportCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data: category, loading, error, refetch } = useSupportCategory(id);
  const updateMutation = useUpdateSupportCategory();
  const deleteMutation = useDeleteSupportCategory();

  if (loading && !category) return <SupportDetailSkeleton />;
  if (error || !category) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("support.categoryNotFound", "Support category not found")}
          description={mapTransactionUiError(
            error ? new Error(error) : null,
            t("support.categoryUnavailable", "The category is unavailable.")
          )}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <CategoryDetailWorkspace
      category={category}
      count={category.ticketCount ?? 0}
      countLabel="Tickets"
      backHref="/dashboard/support/categories"
      backLabel="Back to categories"
      breadcrumbLabel="Support categories"
      nav={<SupportNavLinks />}
      canWrite={has(SUPPORT_PERMISSIONS.WRITE)}
      onUpdate={(input) => updateMutation.mutateAsync({ id, input })}
      onDelete={() => deleteMutation.mutateAsync({ id })}
      onDeleted={() => router.push("/dashboard/support/categories")}
    />
  );
}
