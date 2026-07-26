"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import { KnowledgeTableSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import { useCreateKnowledgeCategory, useKnowledgeCategories } from "@/lib/hooks/use-knowledge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { KNOWLEDGE_PERMISSIONS } from "@ierp/shared";

export default function KnowledgeCategoriesPage() {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(KNOWLEDGE_PERMISSIONS.WRITE);
  const [createOpen, setCreateOpen] = useState(false);
  const [lifecycleFilter, setLifecycleFilter] = useState<"active" | "all" | "archived">("active");
  const createMutation = useCreateKnowledgeCategory();
  const activeOnly =
    lifecycleFilter === "active" ? true : lifecycleFilter === "archived" ? false : undefined;
  const { data, loading, error, refetch } = useKnowledgeCategories({ activeOnly });

  if (loading && !data) return <KnowledgeTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title={t("knowledge.categoriesLoadError")} description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("knowledge.categoriesTitle")}
          description={t("knowledge.categoriesDesc")}
          actions={
            canWrite ? (
              <Button type="button" className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t("masterData.createCategory", "Create Category")}
              </Button>
            ) : undefined
          }
        />
      </FadeIn>
      <FadeIn delay={0.04}>
        <KnowledgeNavLinks />
      </FadeIn>
      <FadeIn delay={0.05}>
        <div className="mb-4">
          <select
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={lifecycleFilter}
            onChange={(e) =>
              setLifecycleFilter(e.target.value as "active" | "all" | "archived")
            }
            aria-label={t("masterData.lifecycle", "Lifecycle")}
          >
            <option value="active">{t("common.active", "Active")}</option>
            <option value="all">{t("masterData.allLifecycle", "All")}</option>
            <option value="archived">{t("masterData.archivedOnly", "Archived only")}</option>
          </select>
        </div>
      </FadeIn>
      <FadeIn delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.data ?? []).map((cat) => (
            <Card key={cat.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <Link
                    href={`/dashboard/knowledge/categories/${cat.id}`}
                    className="cursor-pointer text-[var(--accent)] hover:underline"
                  >
                    {cat.name}
                  </Link>
                  <Badge variant={cat.isActive ? "default" : "secondary"} className="text-[10px]">
                    {cat.isActive ? t("knowledge.active") : t("knowledge.inactive")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-mono text-xs text-[var(--muted)]">{cat.code}</p>
                {cat.description && <p className="text-[var(--muted)]">{cat.description}</p>}
                <p className="font-medium">
                  {cat.articleCount ?? 0} {t("knowledge.articlesTitle").toLowerCase()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      {canWrite ? (
        <CreateCategoryDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title={t("masterData.createCategory", "Create Category")}
          requireCode
          codeHint={t("knowledge.categoryCodeHint", "Unique short code for this category (e.g. SOP, HR).")}
          detailHref={(id) => `/dashboard/knowledge/categories/${id}`}
          isPending={createMutation.isPending}
          onSubmit={(input) =>
            createMutation.mutateAsync({
              code: input.code!,
              name: input.name,
              description: input.description,
              isActive: input.isActive,
            })
          }
        />
      ) : null}
    </ModuleLayout>
  );
}
