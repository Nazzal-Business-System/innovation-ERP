"use client";

import { use } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Archive, ArchiveRestore, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { KnowledgeNavLinks } from "@/components/knowledge/knowledge-gate";
import {
  KNOWLEDGE_STATUS_LABELS,
  KNOWLEDGE_VISIBILITY_LABELS,
} from "@/components/knowledge/knowledge-columns";
import { KnowledgeDetailSkeleton } from "@/components/knowledge/knowledge-page-skeleton";
import dynamic from "next/dynamic";
import { EntityActionBar } from "@/components/entity-workspace/entity-action-bar";
import { EntityAudit } from "@/components/entity-workspace/entity-audit";
import { EntityEmptyState } from "@/components/entity-workspace/entity-empty-state";
import { EntityFieldGrid } from "@/components/entity-workspace/entity-field-grid";
import { EntityHeader } from "@/components/entity-workspace/entity-header";
import { EntityMetrics } from "@/components/entity-workspace/entity-metrics";
import { EntityOwner, EntityWorkflow } from "@/components/entity-workspace/entity-owner";
import { EntityRelations } from "@/components/entity-workspace/entity-relations";
import { EntitySection } from "@/components/entity-workspace/entity-section";
import { EntityStatus } from "@/components/entity-workspace/entity-status";
import { EntityTitle } from "@/components/entity-workspace/entity-title";
import { OperationalWorkspace } from "@/components/entity-workspace/templates/category-workspaces";
import type { EntityAction } from "@/lib/entity-workspace";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { formatDisplayDateTime } from "@/lib/date";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import {
  useArchiveKnowledgeArticle,
  useRestoreKnowledgeArticle,
  useKnowledgeCategories,
  useKnowledgeArticle,
  usePublishKnowledgeArticle,
  useUpdateKnowledgeArticle,
} from "@/lib/hooks/use-knowledge";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import {
  KNOWLEDGE_PERMISSIONS,
  type KnowledgeVisibility,
} from "@ierp/shared";

const MarkdownEditor = dynamic(
  () =>
    import("@/components/markdown/markdown-editor").then((m) => ({
      default: m.MarkdownEditor,
    })),
  {
    loading: () => (
      <div className="min-h-[200px] animate-pulse rounded-xl bg-[var(--muted-bg)]" />
    ),
  }
);

const MarkdownPreview = dynamic(
  () =>
    import("@/components/markdown/markdown-preview").then((m) => ({
      default: m.MarkdownPreview,
    })),
  {
    loading: () => (
      <div className="min-h-[200px] animate-pulse rounded-xl bg-[var(--muted-bg)]" />
    ),
  }
);

export default function KnowledgeArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(KNOWLEDGE_PERMISSIONS.WRITE);
  const { data: article, loading, error, refetch } = useKnowledgeArticle(id);
  const publishMutation = usePublishKnowledgeArticle();
  const archiveMutation = useArchiveKnowledgeArticle();
  const restoreMutation = useRestoreKnowledgeArticle();
  const updateMutation = useUpdateKnowledgeArticle();
  const { data: categoriesData } = useKnowledgeCategories();
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editVisibility, setEditVisibility] = useState<KnowledgeVisibility>("INTERNAL");
  const [editTags, setEditTags] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!article) return;
    setEditTitle(article.title);
    setEditSummary(article.summary ?? "");
    setEditContent(article.content);
    setEditCategoryId(article.categoryId ?? "");
    setEditVisibility(article.visibility);
    setEditTags(article.tags.join(", "));
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(nextOpen: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, nextOpen)) return;
    setEditOpen(nextOpen);
    if (!nextOpen) setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!article || !canWrite || editSubmitting || !editTitle.trim() || !editContent.trim()) {
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          title: editTitle.trim(),
          summary: editSummary.trim() || null,
          content: editContent,
          categoryId: editCategoryId || null,
          visibility: editVisibility,
          tags: editTags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      });
      setEditOpen(false);
      setActionSuccess("Knowledge article updated.");
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handlePublish() {
    if (
      !canWrite ||
      publishMutation.isPending ||
      archiveMutation.isPending ||
      restoreMutation.isPending
    ) {
      return;
    }
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await publishMutation.mutateAsync({ id });
      setActionSuccess(t("knowledge.published"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setActing(false);
    }
  }

  async function handleArchive() {
    if (
      !canWrite ||
      publishMutation.isPending ||
      archiveMutation.isPending ||
      restoreMutation.isPending
    ) {
      return;
    }
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await archiveMutation.mutateAsync({ id });
      setActionSuccess(t("knowledge.archived"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setActing(false);
    }
  }

  async function handleRestore() {
    if (
      !canWrite ||
      publishMutation.isPending ||
      archiveMutation.isPending ||
      restoreMutation.isPending
    ) {
      return;
    }
    setActing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await restoreMutation.mutateAsync({ id });
      setActionSuccess(t("knowledge.restored", "Article restored"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <KnowledgeDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !article) {
    return (
      <ModuleLayout maxWidth="lg">
        <OperationalWorkspace
          entityType="knowledge-article"
          entityId={id}
          error={error ?? t("knowledge.articleNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canPublish =
    canWrite && article.status !== "PUBLISHED" && article.status !== "ARCHIVED";
  const canArchive = canWrite && article.status !== "ARCHIVED";
  const canRestore = canWrite && article.status === "ARCHIVED";
  const canEdit = canWrite && article.status !== "ARCHIVED";
  const statusVariant =
    article.status === "PUBLISHED"
      ? "success"
      : article.status === "REVIEW"
        ? "warning"
        : article.status === "ARCHIVED"
          ? "secondary"
          : "default";
  const actions: EntityAction[] = [
    ...(canEdit
      ? [
          {
            id: "edit",
            label: "Edit article",
            icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "edit",
            onSelect: openEditDialog,
          },
        ]
      : []),
    ...(canPublish
      ? [
          {
            id: "publish",
            label: t("knowledge.publish"),
            icon: <Send className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "transition",
            pending: acting,
            confirm: "soft" as const,
            confirmTitle: `${t("knowledge.publish")} — ${article.title}`,
            confirmDescription: t(
              "entityWorkspace.confirmDescription",
              "This action will update the record."
            ),
            onSelect: () => void handlePublish(),
          },
        ]
      : []),
    ...(canArchive
      ? [
          {
            id: "archive",
            label: t("knowledge.archive"),
            icon: <Archive className="h-3.5 w-3.5" aria-hidden />,
            kind: "destructive" as const,
            capability: "archive",
            pending: acting || archiveMutation.isPending,
            confirm: "hard" as const,
            confirmTitle: `${t("knowledge.archive")} — ${article.title}`,
            confirmDescription: t(
              "entityWorkspace.confirmDescription",
              "This action will update the record."
            ),
            onSelect: () => void handleArchive(),
          },
        ]
      : []),
    ...(canRestore
      ? [
          {
            id: "restore",
            label: t("masterData.restore", "Restore"),
            icon: <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "restore",
            pending: acting || restoreMutation.isPending,
            confirm: "soft" as const,
            confirmTitle: `${t("masterData.restore", "Restore")} — ${article.title}`,
            confirmDescription: t(
              "knowledge.restoreConsequence",
              "This article will return to draft and can be edited again."
            ),
            onSelect: () => void handleRestore(),
          },
        ]
      : []),
  ];
  const workflowStatuses = ["DRAFT", "REVIEW", "PUBLISHED"] as const;
  const activeWorkflowIndex =
    article.status === "ARCHIVED" ? -1 : workflowStatuses.indexOf(article.status);
  const workflowSteps =
    article.status === "ARCHIVED"
      ? [{ id: "ARCHIVED", label: KNOWLEDGE_STATUS_LABELS.ARCHIVED, active: true }]
      : workflowStatuses.map((status, index) => ({
          id: status,
          label: KNOWLEDGE_STATUS_LABELS[status],
          active: index === activeWorkflowIndex,
          done: index < activeWorkflowIndex,
        }));
  const relations = [
    ...article.documents.map((link) => ({
      id: `document-${link.id}`,
      label: link.document.title,
      description: t("knowledge.linkedDocuments"),
      meta: link.document.fileNumber,
      href: `/dashboard/documents/files/${link.document.id}`,
    })),
    ...article.supportTickets.map((link) => ({
      id: `ticket-${link.id}`,
      label: link.ticket.title,
      description: t("knowledge.linkedTickets"),
      meta: link.ticket.ticketNumber,
      href: `/dashboard/support/tickets/${link.ticket.id}`,
    })),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/knowledge/articles">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("knowledge.backToArticles")}
          </Link>
        </Button>
      </div>

      <ActionFeedback error={actionError} success={actionSuccess} />
      <KnowledgeNavLinks />

      <OperationalWorkspace
        entityType="knowledge-article"
        entityId={article.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("knowledge.articlesTitle"), href: "/dashboard/knowledge/articles" },
              { label: article.articleNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={article.title}
                subtitle={<span className="ew-ltr-isolate font-mono">{article.articleNumber}</span>}
                trailing={
                  <div className="flex flex-wrap items-center gap-2">
                    <EntityStatus
                      label={KNOWLEDGE_STATUS_LABELS[article.status]}
                      variant={statusVariant}
                    />
                    <Badge variant="outline">
                      {KNOWLEDGE_VISIBILITY_LABELS[article.visibility]}
                    </Badge>
                  </div>
                }
              />
              <EntityActionBar
                actions={actions}
                capabilities={
                  canWrite
                    ? [
                        "edit",
                        "transition",
                        article.status === "ARCHIVED" ? "restore" : "archive",
                      ]
                    : []
                }
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "documents",
                label: t("knowledge.linkedDocuments"),
                value: String(article.documents.length),
              },
              {
                id: "tickets",
                label: t("knowledge.linkedTickets"),
                value: String(article.supportTickets.length),
              },
              {
                id: "tags",
                label: t("knowledge.tags"),
                value: String(article.tags.length),
              },
              {
                id: "updated",
                label: t("knowledge.updatedAt"),
                value: <span className="ew-ltr-isolate">{formatDisplayDateTime(article.updatedAt, locale)}</span>,
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection
              id="content"
              title={t("knowledge.content")}
              description={article.summary ?? undefined}
              defaultOpen
            >
              <MarkdownPreview content={article.content} />
            </EntitySection>

            <EntitySection id="metadata" title={t("knowledge.metadata")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "category",
                    label: t("knowledge.category"),
                    value: article.category?.name ?? "—",
                  },
                  {
                    id: "visibility",
                    label: t("knowledge.visibility"),
                    value: KNOWLEDGE_VISIBILITY_LABELS[article.visibility],
                  },
                  {
                    id: "published",
                    label: t("knowledge.publishedAt"),
                    value: formatDisplayDateTime(article.publishedAt, locale),
                  },
                  {
                    id: "updated",
                    label: t("knowledge.updatedAt"),
                    value: formatDisplayDateTime(article.updatedAt, locale),
                  },
                ]}
              />
            </EntitySection>

            <EntitySection id="tags" title={t("knowledge.tags")}>
              {article.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("common.noData")}
                />
              )}
            </EntitySection>
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={KNOWLEDGE_STATUS_LABELS[article.status]}
              steps={workflowSteps}
              defaultOpen
            />
            {article.author ? (
              <EntityOwner name={article.author.name} role={article.author.email} defaultOpen />
            ) : null}
            <EntityRelations
              items={relations}
              title={t("knowledge.linkedStats")}
              emptyTitle={t("entityWorkspace.noRelated")}
              emptyDescription=""
            />
          </>
        }
        footer={
          <EntityAudit
            meta={{
              id: article.id,
              createdAt: formatDisplayDateTime(article.createdAt, locale),
              createdBy: article.author?.name,
              updatedAt: formatDisplayDateTime(article.updatedAt, locale),
            }}
          />
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("knowledge.editArticle", "Edit knowledge article")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
            <ActionFeedback error={editError} />
            <FormField label={t("knowledge.articleTitle")} htmlFor="edit-article-title" required>
              <input
                id="edit-article-title"
                className={inputClassName}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={editSubmitting}
                required
              />
            </FormField>
            <FormField label={t("knowledge.summary")} htmlFor="edit-article-summary">
              <textarea
                id="edit-article-summary"
                className={cn(textareaClassName, "min-h-20")}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="edit-article-category"
                label={t("knowledge.category")}
                value={editCategoryId}
                onChange={setEditCategoryId}
                options={[
                  { value: "", label: t("knowledge.noCategory") },
                  ...(categoriesData?.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                disabled={editSubmitting}
              />
              <SelectField
                id="edit-article-visibility"
                label={t("knowledge.visibility")}
                value={editVisibility}
                onChange={(value) => setEditVisibility(value as KnowledgeVisibility)}
                options={Object.entries(KNOWLEDGE_VISIBILITY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                disabled={editSubmitting}
              />
            </div>
            <FormField label={t("knowledge.content")} htmlFor="edit-article-content" required>
              <MarkdownEditor
                id="edit-article-content"
                value={editContent}
                onChange={setEditContent}
                disabled={editSubmitting}
                required
                minHeightClassName="min-h-[16rem]"
              />
            </FormField>
            <FormField label={t("knowledge.tagsComma")} htmlFor="edit-article-tags">
              <input
                id="edit-article-tags"
                className={inputClassName}
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("common.save")}
              loading={editSubmitting}
              disabled={editSubmitting || !editTitle.trim() || !editContent.trim()}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
