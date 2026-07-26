"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { CategoryDetailWorkspace } from "@/components/entity-workspace/category-detail-workspace";
import { ErrorState } from "@/components/feedback/error-state";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import { KnowledgeDetailSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  useDeleteKnowledgeCategory,
  useKnowledgeCategory,
  useUpdateKnowledgeCategory,
} from "@/lib/hooks/use-knowledge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useI18n } from "@/lib/i18n";
import { KNOWLEDGE_PERMISSIONS } from "@ierp/shared";

export default function KnowledgeCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const { has } = usePermissions();
  const { data: category, loading, error, refetch } = useKnowledgeCategory(id);
  const updateMutation = useUpdateKnowledgeCategory();
  const deleteMutation = useDeleteKnowledgeCategory();

  if (loading && !category) return <KnowledgeDetailSkeleton />;
  if (error || !category) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("knowledge.categoryNotFound", "Knowledge category not found")}
          description={mapTransactionUiError(
            error ? new Error(error) : null,
            t("knowledge.categoryUnavailable", "The category is unavailable.")
          )}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <CategoryDetailWorkspace
      category={category}
      count={category.articleCount ?? 0}
      countLabel="Articles"
      backHref="/dashboard/knowledge/categories"
      backLabel="Back to categories"
      breadcrumbLabel="Knowledge categories"
      nav={<KnowledgeNavLinks />}
      canWrite={has(KNOWLEDGE_PERMISSIONS.WRITE)}
      onUpdate={(input) => updateMutation.mutateAsync({ id, input })}
      onDelete={() => deleteMutation.mutateAsync({ id })}
      onDeleted={() => router.push("/dashboard/knowledge/categories")}
    />
  );
}
