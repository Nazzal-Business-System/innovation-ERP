"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import { KnowledgeTableSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import { useKnowledgeTags } from "@/lib/hooks/use-knowledge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function KnowledgeTagsPage() {
  const { t } = useI18n();
  const { data, loading, error, refetch } = useKnowledgeTags();

  if (loading && !data) return <KnowledgeTableSkeleton />;

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title={t("knowledge.tagsLoadError")} description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const tags = data?.data ?? [];
  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader title={t("knowledge.tagsTitle")} description={t("knowledge.tagsDesc")} />
      </FadeIn>
      <FadeIn delay={0.04}>
        <KnowledgeNavLinks />
      </FadeIn>
      <FadeIn delay={0.06}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("knowledge.tagCloud")}</CardTitle>
            <CardDescription>{t("knowledge.tagCloudDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map((item) => {
                const scale = 0.75 + (item.count / maxCount) * 0.5;
                return (
                  <Badge
                    key={item.tag}
                    variant="secondary"
                    className={cn("cursor-default px-3 py-1.5")}
                    style={{ fontSize: `${scale}rem` }}
                  >
                    {item.tag}
                    <span className="ms-1.5 rounded-full bg-[var(--background)] px-1.5 text-[10px] tabular-nums">
                      {item.count}
                    </span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </ModuleLayout>
  );
}
