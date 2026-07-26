"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useKnowledgeArticlesByTicket } from "@/lib/hooks/use-knowledge";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { Skeleton } from "@/components/ui/skeleton";
import { KNOWLEDGE_STATUS_LABELS } from "./knowledge-columns";

interface RelatedKnowledgePanelProps {
  supportTicketId: string;
}

export function RelatedKnowledgePanel({ supportTicketId }: RelatedKnowledgePanelProps) {
  const { t } = useI18n();
  const { startNavigation } = useNavigation();
  const { data, loading, error } = useKnowledgeArticlesByTicket(supportTicketId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" aria-hidden />
            {t("knowledge.relatedArticles")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const items = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" aria-hidden />
          {t("knowledge.relatedArticles")}
        </CardTitle>
        <CardDescription>{t("knowledge.relatedArticlesDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error || items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("knowledge.noRelatedArticles")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((article) => {
              const href = `/dashboard/knowledge/articles/${article.id}`;
              return (
                <li key={article.id}>
                  <Link
                    href={href}
                    onClick={() => startNavigation(href)}
                    className="ierp-focus-ring flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 transition-colors hover:border-[var(--sidebar-active-border)] hover:bg-[var(--accent-muted)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{article.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {article.articleNumber} · {KNOWLEDGE_STATUS_LABELS[article.status]}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--accent)]">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
