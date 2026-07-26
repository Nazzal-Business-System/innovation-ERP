"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { DocumentsNavLinks } from "@/components/documents/documents-gate";
import { DocumentDetailSkeleton } from "@/components/documents/documents-page-skeleton";
import { CategoryDetailWorkspace } from "@/components/entity-workspace/category-detail-workspace";
import { ErrorState } from "@/components/feedback/error-state";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  useDeleteDocumentCategory,
  useDocumentCategory,
  useUpdateDocumentCategory,
} from "@/lib/hooks/use-documents";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useI18n } from "@/lib/i18n";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";

export default function DocumentCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data: category, loading, error, refetch } = useDocumentCategory(id);
  const updateMutation = useUpdateDocumentCategory();
  const deleteMutation = useDeleteDocumentCategory();

  if (loading && !category) return <DocumentDetailSkeleton />;
  if (error || !category) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("documents.categoryNotFound", "Document category not found")}
          description={mapTransactionUiError(
            error ? new Error(error) : null,
            t("documents.categoryUnavailable", "The category is unavailable.")
          )}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <CategoryDetailWorkspace
      category={category}
      count={category.documentCount ?? 0}
      countLabel="Documents"
      backHref="/dashboard/documents/categories"
      backLabel="Back to categories"
      breadcrumbLabel="Document categories"
      nav={<DocumentsNavLinks />}
      canWrite={has(DOCUMENTS_PERMISSIONS.WRITE)}
      onUpdate={(input) => updateMutation.mutateAsync({ id, input })}
      onDelete={() => deleteMutation.mutateAsync({ id })}
      onDeleted={() => router.push("/dashboard/documents/categories")}
    />
  );
}
